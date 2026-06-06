from __future__ import annotations

import re
import uuid
from datetime import date


RELATION_ALIASES = {
    "self": ("me", "myself", "self"),
    "mother": ("mother", "mom", "mum", "mummy"),
    "father": ("father", "dad", "papa", "daddy"),
    "parent": ("parent",),
    "wife": ("wife",),
    "husband": ("husband",),
    "spouse": ("spouse", "partner"),
    "son": ("son",),
    "daughter": ("daughter",),
    "child": ("child", "kid"),
    "brother": ("brother",),
    "sister": ("sister",),
    "sibling": ("sibling",),
    "grandmother": ("grandmother", "grandma", "nani", "dadi"),
    "grandfather": ("grandfather", "grandpa", "nana", "dada"),
    "grandchild": ("grandchild", "grandson", "granddaughter"),
    "aunt": ("aunt", "aunty", "auntie"),
    "uncle": ("uncle",),
    "cousin": ("cousin",),
    "other": (),
}


async def ensure_family_profile_schema(conn) -> None:
    await conn.execute(
        """
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS aliases JSONB NOT NULL DEFAULT '[]'::JSONB;
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE document_upload_logs ADD COLUMN IF NOT EXISTS subject_match_status VARCHAR(30);
        ALTER TABLE document_upload_logs ADD COLUMN IF NOT EXISTS subject_match_confidence NUMERIC(4,3);
        ALTER TABLE document_upload_logs ADD COLUMN IF NOT EXISTS originally_selected_profile_id UUID;
        CREATE INDEX IF NOT EXISTS idx_profiles_user_relation ON profiles (user_id, relation);
        CREATE INDEX IF NOT EXISTS idx_document_upload_logs_profile
          ON document_upload_logs (user_id, profile_id, uploaded_at DESC);
        """
    )


async def list_family_profiles(conn, user_id: str) -> list[dict]:
    rows = await conn.fetch(
        """
        SELECT id, COALESCE(display_name, name, 'Me') AS display_name,
               COALESCE(relation, relationship, 'other') AS relation,
               date_of_birth, sex, aliases, notes, created_at, updated_at
        FROM profiles
        WHERE user_id = $1
        ORDER BY CASE WHEN COALESCE(relation, relationship) = 'self' THEN 0 ELSE 1 END,
                 created_at ASC
        """,
        user_id,
    )
    return [dict(row) for row in rows]


async def ensure_profiles_from_message(
    conn,
    user_id: str,
    message: str,
    profiles: list[dict],
) -> list[dict]:
    if not any(profile.get("relation") == "self" for profile in profiles):
        await conn.execute(
            """
            INSERT INTO profiles (user_id, display_name, relation, name, relationship)
            VALUES ($1, 'Me', 'self', 'Me', 'self')
            """,
            user_id,
        )
        profiles = await list_family_profiles(conn, user_id)
    text = _normalise(message)
    existing_relations = {profile.get("relation") for profile in profiles}
    for relation, aliases in RELATION_ALIASES.items():
        if relation in {"self", "other"} or relation in existing_relations:
            continue
        if not any(_contains_term(text, alias) for alias in aliases):
            continue
        display_name = _name_after_relation(message, aliases) or relation.title()
        await conn.execute(
            """
            INSERT INTO profiles
              (user_id, display_name, relation, name, relationship, aliases)
            VALUES ($1, $2, $3, $2, $3, $4::JSONB)
            """,
            user_id,
            display_name,
            relation,
            "[]",
        )
        existing_relations.add(relation)
    return await list_family_profiles(conn, user_id)


async def create_profile_for_document(
    conn,
    user_id: str,
    patient_name: str,
    patient_sex: str | None = None,
) -> dict:
    display_name = " ".join(str(patient_name).split())[:255] or "Family member"
    row = await conn.fetchrow(
        """
        INSERT INTO profiles
          (user_id, display_name, relation, name, relationship, sex, aliases)
        VALUES ($1, $2, 'other', $2, 'other', $3, '[]'::JSONB)
        RETURNING id, display_name, relation, date_of_birth, sex, aliases, notes,
                  created_at, updated_at
        """,
        user_id,
        display_name,
        patient_sex,
    )
    return dict(row)


def resolve_referenced_profiles(message: str, profiles: list[dict]) -> list[dict]:
    text = _normalise(message)
    matches = []
    for profile in profiles:
        terms = _profile_terms(profile)
        matched_terms = [term for term in terms if _contains_term(text, term)]
        if matched_terms:
            matches.append({**profile, "matched_terms": matched_terms})
    return matches


def match_patient_profile(patient_name: str | None, profiles: list[dict]) -> tuple[uuid.UUID | None, float]:
    if not patient_name:
        return None, 0.0
    patient_tokens = _name_tokens(patient_name)
    if not patient_tokens:
        return None, 0.0

    scored = []
    for profile in profiles:
        candidate_names = [profile.get("display_name") or ""]
        candidate_names.extend(profile.get("aliases") or [])
        score = max((_name_score(patient_tokens, _name_tokens(name)) for name in candidate_names), default=0.0)
        if score:
            scored.append((score, profile["id"]))

    scored.sort(reverse=True, key=lambda item: item[0])
    if not scored or scored[0][0] < 0.72:
        return None, scored[0][0] if scored else 0.0
    if len(scored) > 1 and scored[0][0] - scored[1][0] < 0.12:
        return None, scored[0][0]
    return scored[0][1], scored[0][0]


def profile_age(profile: dict, today: date | None = None) -> int | None:
    born = profile.get("date_of_birth")
    if not born:
        return None
    today = today or date.today()
    return today.year - born.year - ((today.month, today.day) < (born.month, born.day))


def memory_target_profile(
    primary_profile_id: uuid.UUID | None,
    referenced_profiles: list[dict],
) -> uuid.UUID | None:
    explicit_other_profiles = {
        profile["id"]
        for profile in referenced_profiles
        if profile["id"] != primary_profile_id
        and profile.get("relation") != "self"
    }
    if len(explicit_other_profiles) == 1:
        return next(iter(explicit_other_profiles))
    if len(explicit_other_profiles) > 1:
        return None
    return primary_profile_id


def family_risk_considerations(
    subject_profile: dict | None,
    family_profiles: list[dict],
) -> list[str]:
    if not subject_profile:
        return []
    subject_age = profile_age(subject_profile)
    considerations = []
    for relative in family_profiles:
        if relative.get("id") == subject_profile.get("id"):
            continue
        summary = str(relative.get("health_summary") or "").casefold()
        relation = relative.get("relation") or "relative"
        if relation in {"mother", "father", "parent"} and any(
            term in summary for term in ("diabetes", "hba1c", "high blood sugar")
        ):
            age_context = (
                f"The subject is {subject_age}."
                if subject_age is not None
                else "The subject's age is not recorded."
            )
            considerations.append(
                f"{relation.title()} has diabetes-related history. {age_context} "
                "Consider asking a clinician when glucose or HbA1c screening is appropriate; "
                "timing also depends on weight, pregnancy history, medicines, and other risks."
            )
        if any(term in summary for term in ("breast cancer", "ovarian cancer", "colorectal cancer")):
            considerations.append(
                f"{relation.title()} has a cancer-related family history. Ask whether the "
                "pattern, age at diagnosis, and number of affected relatives change screening "
                "or genetic-counselling recommendations."
            )
        if relation in {"mother", "father", "brother", "sister"} and any(
            term in summary for term in ("heart attack", "coronary artery", "stroke")
        ):
            considerations.append(
                f"{relation.title()} has cardiovascular history. Ask about blood pressure, "
                "lipids, diabetes risk, smoking, and whether the relative's age at onset "
                "changes prevention planning."
            )
    return list(dict.fromkeys(considerations))[:8]


def public_profile(profile: dict) -> dict:
    return {
        "id": str(profile["id"]),
        "display_name": profile.get("display_name") or "Unnamed",
        "relation": profile.get("relation") or "other",
        "date_of_birth": profile["date_of_birth"].isoformat() if profile.get("date_of_birth") else None,
        "age": profile_age(profile),
        "sex": profile.get("sex"),
        "aliases": list(profile.get("aliases") or []),
        "notes": profile.get("notes"),
    }


def _profile_terms(profile: dict) -> set[str]:
    terms = {
        _normalise(profile.get("display_name") or ""),
        *(_normalise(alias) for alias in (profile.get("aliases") or [])),
        *RELATION_ALIASES.get(profile.get("relation") or "other", ()),
    }
    return {term for term in terms if len(term) >= 2}


def _contains_term(text: str, term: str) -> bool:
    return bool(re.search(rf"(?<![a-z0-9]){re.escape(term)}(?![a-z0-9])", text))


def _normalise(value: str) -> str:
    return " ".join(re.findall(r"[a-z0-9]+", str(value).casefold()))


def _name_tokens(value: str) -> set[str]:
    ignored = {"mr", "mrs", "ms", "dr", "master", "patient"}
    return {token for token in _normalise(value).split() if len(token) > 1 and token not in ignored}


def _name_score(left: set[str], right: set[str]) -> float:
    if not left or not right:
        return 0.0
    overlap = len(left & right)
    if not overlap:
        return 0.0
    containment = overlap / min(len(left), len(right))
    jaccard = overlap / len(left | right)
    return round((containment * 0.7) + (jaccard * 0.3), 3)


def _name_after_relation(message: str, aliases: tuple[str, ...]) -> str | None:
    alternatives = "|".join(re.escape(alias) for alias in aliases)
    match = re.search(
        rf"\b(?:my\s+)?(?:{alternatives})\s+(?:is\s+|named\s+|called\s+)?([A-Z][a-z]{{1,30}})\b",
        message,
        flags=re.IGNORECASE,
    )
    if not match:
        return None
    candidate = match.group(1)
    if candidate.casefold() in {"has", "had", "gets", "was", "is", "with"}:
        return None
    return candidate.title()

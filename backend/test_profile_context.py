import uuid
from datetime import date
from unittest import IsolatedAsyncioTestCase, TestCase

from db.profile_context import (
    ensure_profiles_from_message,
    family_risk_considerations,
    match_patient_profile,
    memory_target_profile,
    profile_age,
    resolve_referenced_profiles,
)


def profile(name, relation, aliases=None):
    return {
        "id": uuid.uuid4(),
        "display_name": name,
        "relation": relation,
        "aliases": aliases or [],
        "date_of_birth": None,
        "sex": None,
        "notes": None,
    }


class ProfileResolutionTests(TestCase):
    def test_resolves_relationship_and_saved_name(self):
        father = profile("Ramesh", "father", ["R. Kumar"])
        daughter = profile("Anita", "daughter")

        matches = resolve_referenced_profiles(
            "Does my father Ramesh's diabetes change what Anita should test?",
            [father, daughter],
        )

        self.assertEqual({father["id"], daughter["id"]}, {item["id"] for item in matches})

    def test_does_not_confuse_mother_and_grandmother(self):
        mother = profile("Sunita", "mother")
        grandmother = profile("Kamala", "grandmother")

        matches = resolve_referenced_profiles(
            "My grandmother had osteoporosis.",
            [mother, grandmother],
        )

        self.assertEqual([grandmother["id"]], [item["id"] for item in matches])

    def test_patient_name_matches_alias(self):
        self_profile = profile("Gurunath", "self", ["M Gurunath"])
        father = profile("Ramesh Kumar", "father")

        matched_id, confidence = match_patient_profile(
            "Mr. M Gurunath",
            [self_profile, father],
        )

        self.assertEqual(self_profile["id"], matched_id)
        self.assertGreaterEqual(confidence, 0.72)

    def test_ambiguous_patient_name_is_not_silently_assigned(self):
        first = profile("Anita Rao", "daughter")
        second = profile("Anita Sharma", "sister")

        matched_id, confidence = match_patient_profile("Anita", [first, second])

        self.assertIsNone(matched_id)
        self.assertGreater(confidence, 0)

    def test_age_uses_birthday_boundary(self):
        person = {"date_of_birth": date(2000, 6, 8)}

        self.assertEqual(25, profile_age(person, date(2026, 6, 7)))
        self.assertEqual(26, profile_age(person, date(2026, 6, 8)))

    def test_single_referenced_relative_receives_memory_update(self):
        self_profile = profile("Guru", "self")
        father = profile("Ramesh", "father")

        target = memory_target_profile(self_profile["id"], [self_profile, father])

        self.assertEqual(father["id"], target)

    def test_multiple_referenced_relatives_do_not_receive_ambiguous_update(self):
        self_profile = profile("Guru", "self")
        father = profile("Ramesh", "father")
        mother = profile("Sunita", "mother")

        target = memory_target_profile(self_profile["id"], [father, mother])

        self.assertIsNone(target)

    def test_parent_diabetes_generates_subject_specific_screening_context(self):
        subject = {
            **profile("Anita", "daughter"),
            "date_of_birth": date(1990, 1, 1),
        }
        father = {
            **profile("Ramesh", "father"),
            "health_summary": "Known background: Type 2 diabetes.",
        }

        considerations = family_risk_considerations(subject, [subject, father])

        self.assertEqual(1, len(considerations))
        self.assertIn("Father has diabetes-related history", considerations[0])
        self.assertIn("glucose or HbA1c screening", considerations[0])


class FakeConnection:
    def __init__(self):
        self.inserted = []

    async def execute(self, query, *args):
        self.inserted.append(args)


class AutomaticProfileCreationTests(IsolatedAsyncioTestCase):
    async def test_creates_missing_relation_from_natural_language(self):
        conn = FakeConnection()
        profiles = [profile("Guru", "self")]

        # Avoid requiring a database fetch after insertion.
        import db.profile_context as module
        original = module.list_family_profiles

        async def return_profiles(_conn, _user_id):
            return profiles

        module.list_family_profiles = return_profiles
        try:
            await ensure_profiles_from_message(
                conn,
                "user-1",
                "My father has diabetes.",
                profiles,
            )
        finally:
            module.list_family_profiles = original

        self.assertEqual("father", conn.inserted[0][2])

    async def test_uses_name_supplied_after_relationship(self):
        conn = FakeConnection()
        profiles = [profile("Guru", "self")]
        import db.profile_context as module
        original = module.list_family_profiles

        async def return_profiles(_conn, _user_id):
            return profiles

        module.list_family_profiles = return_profiles
        try:
            await ensure_profiles_from_message(
                conn,
                "user-1",
                "my mother sunita has thyroid problems",
                profiles,
            )
        finally:
            module.list_family_profiles = original

        self.assertEqual("Sunita", conn.inserted[0][1])
        self.assertEqual("mother", conn.inserted[0][2])

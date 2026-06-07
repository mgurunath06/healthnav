export async function consumeEventStream(response, onEvent) {
  if (!response.body) {
    throw new Error('The server returned an empty investigation stream.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done })
    buffer = buffer.replace(/\r\n/g, '\n')

    const frames = buffer.split('\n\n')
    buffer = done ? '' : frames.pop()
    for (const frame of frames) emitFrame(frame, onEvent)

    if (done) {
      if (buffer.trim()) emitFrame(buffer, onEvent)
      break
    }
  }
}

function emitFrame(frame, onEvent) {
  const data = frame
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n')

  if (data) onEvent(JSON.parse(data))
}

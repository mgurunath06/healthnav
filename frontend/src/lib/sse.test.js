import { describe, expect, it, vi } from 'vitest'
import { consumeEventStream } from './sse'

function streamedResponse(chunks) {
  const encoder = new TextEncoder()
  return new Response(new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  }), {
    headers: { 'Content-Type': 'text/event-stream' },
  })
}

describe('consumeEventStream', () => {
  it('parses events split across network chunks', async () => {
    const onEvent = vi.fn()
    await consumeEventStream(streamedResponse([
      'data: {"event":"agent_sta',
      'rted","agent":"screening"}\n\n',
      ': keep-alive\n\n',
      'data: {"event":"final_result","payload":{"status":"complete"}}\n\n',
    ]), onEvent)

    expect(onEvent).toHaveBeenCalledTimes(2)
    expect(onEvent.mock.calls[0][0]).toEqual({
      event: 'agent_started',
      agent: 'screening',
    })
    expect(onEvent.mock.calls[1][0].payload.status).toBe('complete')
  })

  it('supports CRLF and multiline data fields', async () => {
    const onEvent = vi.fn()
    await consumeEventStream(streamedResponse([
      'data: {"event":"agent_completed",\r\n',
      'data: "agent":"assembler"}\r\n\r\n',
    ]), onEvent)

    expect(onEvent).toHaveBeenCalledWith({
      event: 'agent_completed',
      agent: 'assembler',
    })
  })
})

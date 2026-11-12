export function createSerialQueue() {
  let tail = Promise.resolve()
  return task => {
    const result = tail.then(task, task)
    tail = result.then(() => undefined, () => undefined)
    return result
  }
}

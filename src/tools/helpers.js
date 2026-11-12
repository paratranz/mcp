import {readFile} from 'node:fs/promises'
import {basename} from 'node:path'
import {formatError} from '../errors.js'

export function jsonResult(data) {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(data, null, 2)
    }]
  }
}

export async function fileToForm(filePath) {
  const data = await readFile(filePath)
  const form = new FormData()
  form.append('file', new Blob([data]), basename(filePath))
  return form
}

export async function callTool(fn) {
  try {
    return jsonResult(await fn())
  } catch (err) {
    return {
      isError: true,
      content: [{
        type: 'text',
        text: formatError(err)
      }]
    }
  }
}

import {z} from 'zod'
import {callTool, fileToForm} from './helpers.js'

const projectId = z.number().int().positive().describe('Project ID')

export function registerTranslationTools(server, client) {
  server.registerTool('import_file_translation', {
    title: 'Import file translation',
    description: 'Import translations into an existing file. Requires manager role or above. ' +
      'Provide items (JSON mode) or filePath (multipart). Strings are matched by key and new ' +
      'strings are not created. Without force, empty translations, translations equal to the ' +
      'original, unchanged translations and manually translated strings are skipped. ' +
      'Returns the new revision or a status such as hashMatched/unchanged/empty.',
    inputSchema: {
      projectId,
      fileId: z.number().int().positive().describe('File ID'),
      filename: z.string().optional().describe('File name with extension; required in items mode'),
      items: z.array(z.object({
        key: z.string().describe('String key used to match existing strings'),
        translation: z.string().optional().describe('Translation text'),
        stage: z.number().int().optional().describe('Target stage; derived from translation when omitted')
      })).optional().describe('Strings to import (JSON mode)'),
      filePath: z.string().optional().describe('Local path of a file to upload (multipart mode)'),
      path: z.string().optional().describe('Directory recorded in file history, multipart mode only'),
      hash: z.string().optional().describe('Import content hash used to skip duplicate imports'),
      force: z.boolean().optional().describe('Overwrite manually edited translations'),
      skip: z.boolean().optional().describe('Skip the hash check and import anyway')
    }
  }, ({projectId, fileId, filename, items, filePath, path, hash, force, skip}) => callTool(async () => {
    const endpoint = `/projects/${projectId}/files/${fileId}/translation`

    if (items) {
      if (!filename) {
        throw new Error('filename is required when using items')
      }
      return client.post(endpoint, {items, filename, hash, force, skip})
    }

    if (!filePath) {
      throw new Error('Provide items or filePath')
    }

    const form = await fileToForm(filePath)
    if (filename) {
      form.append('filename', filename)
    }
    if (path) {
      form.append('path', path)
    }
    if (force) {
      form.append('force', 'true')
    }
    if (skip) {
      form.append('skip', 'true')
    }
    return client.postForm(endpoint, form)
  }))
}

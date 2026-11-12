import {registerProjectTools} from './projects.js'
import {registerFileTools} from './files.js'
import {registerStringTools} from './strings.js'
import {registerTranslationTools} from './translation.js'
import {registerTermTools} from './terms.js'
import {registerTaskTools} from './tasks.js'
import {registerCollaborationTools} from './collaboration.js'

export function registerTools(server, client) {
  registerProjectTools(server, client)
  registerFileTools(server, client)
  registerStringTools(server, client)
  registerTranslationTools(server, client)
  registerTermTools(server, client)
  registerTaskTools(server, client)
  registerCollaborationTools(server, client)
}

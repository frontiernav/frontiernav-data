const { readFile } = require('@frontiernav/filesystem')
const path = require('path')
const _ = require('lodash')
const log = require('../util/logger').get(__filename)

function createType ({ type, dataFile, nameFile }) {

  const getAllRaw = _.memoize(async () => {
    const content = await readFile(path.resolve(__dirname, '../../data/database/common', dataFile))
    return JSON.parse(content)
  })

  const getAllRawByName = _.memoize(async () => {
    return _(await getAllRaw()).keyBy('Name').value()
  })

  const getAllRawById = _.memoize(async () => {
    return _(await getAllRaw()).keyBy('id').value()
  })

  const getAllRawNamesById = _.memoize(async () => {
    const content = await readFile(path.resolve(__dirname, '../../data/database/common_ms', nameFile))
    return _(JSON.parse(content)).keyBy('id').value()
  })

  const toEntity = _.memoize(async raw => {
    const names = await getAllRawNamesById()
    const name = names[raw.Name]

    if (!name || !name.name) {
      throw new Error(`Failed to find name for ${type}[${raw.Name}]`)
    }

    return {
      name: name.name,
      game_id: raw.id
    }
  }, raw => raw.id)

  return {
    getByName: async name => {
      const allByName = await getAllRawByName()
      const raw = allByName[`${name}`]
      if (!raw) {
        throw new Error(`Failed to find ${type}[${name}]`)
      }
      return toEntity(raw)
    },

    getById: async id => {
      const allById = await getAllRawById()
      const raw = allById[`${id}`]
      if (!raw) {
        throw new Error(`Failed to find ${type}[${id}]`)
      }
      return toEntity(raw)
    },

    getAll: async () => {
      const allRaw = await getAllRaw()
      return Promise
        .all(
          allRaw.map(raw => (
            toEntity(raw)
              .catch(e => {
                log.warn(e)
                return null
              })
          ))
        )
        .then(results => results.filter(r => !!r))
    }
  }
}

module.exports = createType
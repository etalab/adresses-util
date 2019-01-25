#!/usr/bin/env node
require('dotenv').config()
const {resolve} = require('path')
const {promisify} = require('util')
const workerFarm = require('worker-farm')
const {getCodesDepartements} = require('../lib/merge/cog')

const codesDepartements = getCodesDepartements()

function getDepartements() {
  if (!process.env.DEPARTEMENTS) {
    return codesDepartements
  }
  const departements = process.env.DEPARTEMENTS.split(',')
  if (departements.length === 0) {
    throw new Error('La liste de départements fournie est mal formée')
  }
  if (departements.some(codeDep => !codesDepartements.includes(codeDep))) {
    throw new Error('La liste de départements fournie est invalide')
  }
  return departements
}

async function main() {
  const departements = getDepartements()

  const banPathPattern = process.env.BAN_PATH_PATTERN && resolve(process.env.BAN_PATH_PATTERN)
  const balPathPattern = process.env.BAL_PATH_PATTERN && resolve(process.env.BAL_PATH_PATTERN)
  const banoPathPattern = process.env.BANO_PATH_PATTERN && resolve(process.env.BANO_PATH_PATTERN)
  const cadastrePathPattern = process.env.CADASTRE_PATH_PATTERN && resolve(process.env.CADASTRE_PATH_PATTERN)
  const ftthPathPattern = process.env.FTTH_PATH_PATTERN && resolve(process.env.FTTH_PATH_PATTERN)

  if (!process.env.SOURCES) {
    throw new Error('La liste des sources à prendre en compte doit être définie (SOURCES)')
  }

  const sources = process.env.SOURCES.split(',')

  const workerFarmOptions = {
    maxConcurrentWorkers: 4,
    maxCallsPerWorker: 1,
    maxConcurrentCallsPerWorker: 1,
    maxRetries: 0,
    workerOptions: {
      execArgv: ['--max-old-space-size=8192']
    }
  }

  const farm = workerFarm(workerFarmOptions, require.resolve('../lib/merge/worker'))
  const runWorker = promisify(farm)

  await Promise.all(departements.map(async departement => {
    const banPath = banPathPattern.replace('{dep}', departement)
    const banoPath = banoPathPattern.replace('{dep}', departement)
    const cadastrePath = cadastrePathPattern.replace('{dep}', departement)
    const ftthPath = ftthPathPattern.replace('{dep}', departement)
    const balPath = balPathPattern.replace('{dep}', departement)
    await runWorker({
      banPath,
      banoPath,
      cadastrePath,
      ftthPath,
      balPath,
      departement,
      sources
    })
  }))

  workerFarm.end(farm)
}

main()
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

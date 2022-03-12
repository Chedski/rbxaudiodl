require('colors')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const path = require("path")
const { assert } = require('console')

const argv = yargs(hideBin(process.argv))
.help('h')
.alias('h', 'help')

.usage('Usage: $0 [options]')

.boolean('q')
.alias('q','quiet')
.default('q',false)

.boolean('s')
.alias('s','short-filename')
.default('s',false)

.boolean('F')
.alias('F','full-filename')
.default('F',false)

.number('u')
.alias('u', 'user')
.alias('u', 'inv')
.alias('u', 'inventory')
.nargs('u', 1)
.describe('u', `Download all sounds from a user's inventory (note: inventory must be public)`)

.string('i')
.alias('i', 'item')
.nargs('i', 1)
.describe('i', `Download a specific asset ID`)

.string('f')
.alias('f', 'file')
.nargs('f', 1)
.describe('f', 'Download sounds from a list of audio IDs (one line per ID, using rbxassetid, asset URL, or integer ID format)')

.boolean('v')
.alias('v','verbose')
.default('v',false)

.parse(process.argv)
// .check(function (argv) {
//   if ((!argv.user && argv.file) || (argv.user && !argv.file)) {
//     return true;
//   } else {
//     throw(new Error('Specify either a user ID or a newline-separated list file (-u 1234567 OR -f foo.txt'));
//   }
// })

function verbose(text) {
  if (argv.v) console.log(`${" VERBOSE ".bgGray.black} ${text.gray}`)
}
function print(text) {
  if (!argv.q) console.log(`${" INFO ".bgCyan.black} ${text.cyan}`)
}
function printResult(text) {
  console.log(`${" RESULT ".bgGreen.white} ${toString(value).green}`)
}
function printError(text) {
  console.log(`${" ERROR ".bgRed.black} ${text.red}`)
}

function r() {
  return new Promise(async (resolve,reject) => {
    var got = await import('got')

    function getJSON(url) {
      return new Promise(async (resolve,reject) => {
        got.got(url).then((result) => {
          try { resolve(JSON.parse(result.body)) }
          catch(err) { reject(err) }
        }).catch(reject)
      })
    }
    function getBody(url) {
      return new Promise(async (resolve,reject) => {
        got.got(url).then((result) => {
          try { resolve(result.body) }
          catch(err) { reject(err) }
        }).catch(reject)
      })
    }
    function getDataAndMime(url) {
      return new Promise(async (resolve,reject) => {
        got.got(url).then((result) => {
          try { resolve({
            data: result.rawBody,
            mime: result.headers["content-type"]
          }) }
          catch(err) { reject(err) }
        }).catch(reject)
      })
    }
    
    function downloadAudioAsset(str,dlnum) {
      return new Promise(async (resolve,reject) => {
        if (!dlnum) { dlnum = "1/1" }
        verbose(`parsing asset ID from string "${str}"`)
        var audioId = /(?:rbxassetid:\/\/)?(?:(?:https?:\/\/)?(?:www\.)?roblox.com\/(?:asset\?id=)?(?:library\/)?)?(\d+)/g.exec(str)[1]
        if (!audioId) { reject("invalid asset ID"); return }

        print(`downloading asset ${dlnum}: ${audioId}`)

        verbose(`getting page html`)
        var pageHTML = await getBody(`https://www.roblox.com/library/${audioId}/`)

        verbose(`pulling metadata from page html`)

        var mediathumb_result = /data-mediathumb-url="([\w\d:/.]+)"/g.exec(pageHTML)[1]
        verbose(`got mediathumb url: ${mediathumb_result}`)
        if (!argv.s && !argv.F) {
          var safe_filename = /"canonical" href="https:\/\/www.roblox.com\/library\/\d+\/([\w\d-_]+)"/g.exec(pageHTML)[1]
          verbose(`got safe filename: ${safe_filename}`)
        } else {
          verbose(`not getting safe filename as it won't be used (${argv.s?"--short-filename":"--full-filename"})`)
        }
        var real_name = /data-item-name="(.*)"/g.exec(pageHTML)[1]
        verbose(`got full asset name: ${real_name}`)
        
        var name = `${audioId}${argv.s?``:' '+(argv.F ? real_name.replace(/["<>\/\\|:?*]/g,"_") : safe_filename)}`
        verbose(`built base filename: ${name}`)



        // resolve("ok")
      })
    }

    function downloadUser(userId) {
      return new Promise(async (resolve,reject) => {

        if (Math.round(userId) != userId) {reject('user ID must be an integer'); return}

        print(`downloading audio from user ${userId}'s inventory`)

        verbose('checking if inventory is available')
        var {canView} = await getJSON(`https://inventory.roblox.com/v1/users/${userId}/can-view-inventory`)
        verbose(`inventory availability: ${canView}`)
        if (!canView) { reject("user's inventory is not public"); return }

        reject("not implemented")
      })
    }
    
    function downloadFile(fileName) {
      print(`downloading ids from file ${userId}`)
      return new Promise(async (resolve,reject) => {
        reject("not implemented")
      })
    }
    
    if (argv.F && argv.s) { reject("-F (--full-filename) and -s (--short-filename) are mutually exclusive"); return }
    if ((new Boolean(argv.f)+new Boolean(argv.u)+new Boolean(argv.i)) > 1) { reject("-u (--user), -i (--item), and -f (--file) are mutually exclusive") }

    if (argv.u) downloadUser(argv.u).catch(reject)
    else if (argv.f) downloadFile(argv.f).catch(reject)
    else if (argv.i) downloadAudioAsset(argv.i).catch(reject)
    else reject("Specify either a user ID, newline-separated list file, or asset ID (-u 1234567 OR -f foo.txt OR -i 9876543)")
  })
}

r()
.then(printResult)
.catch(printError)
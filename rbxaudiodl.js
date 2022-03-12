require('colors')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const path = require("path")
const fs = require('fs')
var loadingSpinner = require('loading-spinner')
const { formatWithOptions } = require('util')
const { isStringObject } = require('util/types')

const defaultDownloadPath = path.resolve('./download')
if (!fs.existsSync(defaultDownloadPath)) fs.mkdirSync(defaultDownloadPath)

const argv = yargs(hideBin(process.argv))
.help('h')
.alias('h', 'help')

.usage('Usage: $0 [options]')

.string('o')
.alias('o', 'out')
.alias('o', 'out-folder')
.nargs('o', 1)
.describe('o', `Directory to output downloaded files to`)
.default('o',defaultDownloadPath)

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

var nlNextPrint = false

function nlc() {
  if (nlNextPrint) {
    nlNextPrint = false
    return '\n'
  } else return ''
}

function verbose(text) {
  if (argv.v) console.log(`${nlc()}${" VERBOSE ".bgGray.black} ${text.gray}`)
}
function print(text) {
  if (!argv.q) console.log(`${nlc()}${" INFO ".bgCyan.black} ${text.cyan}`)
}
function printResult(result) {
  console.log(`${nlc()}${" RESULT ".bgGreen.white} ${`${result}`.green}`)
}
function printError(text) {
  if (argv.v) console.error(text)
  else console.log(`${nlc()}${" ERROR ".bgRed.black} ${text.red}`)
}

function getFileExt(mime) {
  switch (mime) {
    case "audio/mpeg": return '.mp3'
    case "audio/ogg": return '.ogg'
    default: return ''
  }
}

function setSpinnerText(text) {
  nlNextPrint = true
  loadingSpinner.setSequence(
    [
      `[${'|'.yellow}`.green+`]`.green+` ${text}`.cyan,
      `[${'/'.yellow}`.green+`]`.green+` ${text}`.cyan,
      `[${'-'.yellow}`.green+`]`.green+` ${text}`.cyan,
      `[${'\\'.yellow}`.green+`]`.green+` ${text}`.cyan
    ],
  )
}
function startSpinner(text) {
  nlNextPrint = true
  if (text) setSpinnerText(text)
  loadingSpinner.start(null,{
    clearLine: true,
    hideCursor: true,
  })
}
function stopSpinner() {
  loadingSpinner.stop()
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
        
        startSpinner(`asset ${dlnum} - getting page html`)
        var pageHTML = await getBody(`https://www.roblox.com/library/${audioId}/`)
        
        setSpinnerText(`asset ${dlnum} - reading data from page`)
        verbose(`pulling metadata from page html`)

        if (!argv.s && !argv.F) {
          var safe_filename = /"canonical" href="https:\/\/www.roblox.com\/library\/\d+\/([\w\d-_]+)"/g.exec(pageHTML)[1]
          verbose(`got safe filename: ${safe_filename}`)
        } else {
          verbose(`not getting safe filename as it won't be used (${argv.s?"--short-filename":"--full-filename"})`)
        }
        var real_name = /data-item-name="(.*)"/g.exec(pageHTML)[1]
        verbose(`got full asset name: ${real_name}`)

        var mediathumb_result = /data-mediathumb-url="([\w\d:/.]+)"/g.exec(pageHTML)
        if (!mediathumb_result) { reject(`asset ${audioId} ("${real_name}") had no audio preview (moderated or not an Audio asset..?)`); return }
        var mediathumb = mediathumb_result[1]
        verbose(`got mediathumb url: ${mediathumb}`)
        
        var name = `${audioId}${argv.s?``:' '+(argv.F ? real_name.replace(/["<>\/\\|:?*]/g,"_") : safe_filename)}`
        verbose(`built base filename: ${name}`)

        verbose(`actually downloading: ${mediathumb}`)
        setSpinnerText(`asset ${dlnum} - downloading data`)
        var fileData = await getDataAndMime(mediathumb)
        verbose(`downloaded! mime type: ${fileData.mime}`)
        
        var filename = name + getFileExt(fileData.mime)
        verbose(`built filename: ${filename}`)
        var outPath = path.join(argv.o,filename)
        verbose(`built output path: ${outPath}`)
        setSpinnerText(`asset ${dlnum} - saving file`)
        fs.writeFileSync(outPath,fileData.data)
        resolve(`file successfully downloaded as ${outPath}`)
      })
    }

    function howLongWillThisTake(items) {
      if (items > 2000) return 'this is going to take an eternity (why are you even downloading this many assets???)'
      else if (items > 800) return 'this is going to take an EXTREMELY long time'
      else if (items > 500) return 'this is going to take a very, VERY long time'
      else if (items > 300) return 'this is going to take a VERY long time'
      else if (items > 200) return 'this will take a very long time'
      else if (items > 100) return 'this will take a long time'
      else if (items > 50) return 'this will take a while'
      else return 'this might take a while'
    }

    function downloadUser(userId) {
      return new Promise(async (resolve,reject) => {

        if (Math.round(userId) != userId) {reject('user ID must be an integer'); return}

        print(`downloading audio from user ${userId}'s inventory`)

        startSpinner(`inventory dl - checking availability`)
        verbose('checking if inventory is available')
        var {canView} = await getJSON(`https://inventory.roblox.com/v1/users/${userId}/can-view-inventory`)
        verbose(`inventory availability: ${canView}`)
        if (!canView) { reject("user's inventory is not public"); return }

        var pagenum = 1
        var nextCursor = undefined
        var items = []
        async function getNextInventoryPage() {
          verbose(`getting inventory - page ${pagenum}`)
          setSpinnerText(`inventory dl - getting audio inventory - page ${pagenum} - ${items.length} items found`)
          var data = await getJSON(`https://inventory.roblox.com/v2/users/${userId}/inventory/3?sortOrder=Asc&limit=50${nextCursor?`&cursor=${nextCursor}`:''}`)
          nextCursor = data.nextPageCursor
          verbose(`got page - found ${items.length} items`)
          items = items.concat(data.data)
          pagenum++
        }
        
        verbose(`getting list of inventory items`)
        await getNextInventoryPage()
        while (nextCursor) {
          await getNextInventoryPage()
        }

        print(`downloading ${items.length} assets - ${howLongWillThisTake(items.length)}`)

        function dl(i) {
          return new Promise(async (resolve,reject) => {
            downloadAudioAsset(items[i].assetId,`${i+1}/${items.length}`).then((result) => {
              stopSpinner()
              printResult(result)
              resolve()
            }).catch((reason) => {
              if (!argv.q) printError(`failed to download asset ${items[i].assetId}: ${reason}`)
              resolve()
            })
          })
        }

        for (var i = 0; i < items.length; i++) {
          await dl(i)
        }
      })
    }
    
    function downloadFile(fileName) {
      print(`downloading ids from file ${userId}`)
      return new Promise(async (resolve,reject) => {
        reject("not implemented")
      })
    }

    verbose(`output directory: ${argv.o}`)
    if (!fs.existsSync(argv.o)) { reject("output path does not exist"); return }

    if (argv.F && argv.s) { reject("-F (--full-filename) and -s (--short-filename) are mutually exclusive"); return }

    if ((new Boolean(argv.f)+new Boolean(argv.u)+new Boolean(argv.i)) > 1) { reject("-u (--user), -i (--item), and -f (--file) are mutually exclusive") }

    if (argv.u) downloadUser(argv.u).then(resolve).catch(reject)
    else if (argv.f) downloadFile(argv.f).then(resolve).catch(reject)
    else if (argv.i) downloadAudioAsset(argv.i).then(resolve).catch(reject)
    else reject("Specify either a user ID, newline-separated list file, or asset ID (-u 1234567 OR -f foo.txt OR -i 9876543)")
  })
}

r()
.then((result) => {
  stopSpinner()
  printResult(result)
})
.catch((error) => {
  stopSpinner()
  printError(error)
})
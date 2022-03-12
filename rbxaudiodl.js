require('colors')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const path = require("path")
const fs = require('fs')
const {fileTypeFromBuffer} = require('file-type')
// var loadingSpinner = require('loading-spinner')
var loadingSpinner = require('./loading-spinner-mod.js')
const mimeTypes = require('mime')

const defaultDownloadPath = path.resolve('./download')
if (!fs.existsSync(defaultDownloadPath)) fs.mkdirSync(defaultDownloadPath)

const argv = yargs(hideBin(process.argv))
.help('h')
.alias('h', 'help')

.usage('Usage: $0 [options]')

.string('o')
.alias('o', 'output-to')
.nargs('o', 1)
.describe('o', `Directory to output downloaded files to`)
.default('o')

.boolean('q')
.alias('q','quiet')
.describe('q', `Silence output messages`)
.conflicts('q','v')

.boolean('Q')
.alias('Q','no-output')
.describe('Q', `Disable all non-error output, including the spinner`)
.conflicts('Q','v')

.boolean('A')
.alias('A','async')
.describe('A', `Disables waiting for one file to finish before starting another (MAY CAUSE RATE LIMITING)`)

// .default('q',false)

.boolean('s')
.alias('s','short-filename')
// .default('s',false)
.describe('s', `Use only the ID for the filename (eg. '151915559.mp3' vs '151915559 Terraria-Boss-2.mp3')`)

.boolean('F')
.alias('F','full-filename')
// .default('F',false)
.describe('F', `Include spaces and other valid special characters in the filename (eg. '151915559 Terraria - Boss 2.mp3' vs '151915559 Terraria-Boss-2.mp3')`)

.number('u')
.alias('u', 'user')
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
// .default('v',false)

.parse(process.argv)
// .check(function (argv) {
//   if ((!argv.user && argv.file) || (argv.user && !argv.file)) {
//     return true;
//   } else {
//     throw(new Error('Specify either a user ID or a newline-separated list file (-u 1234567 OR -f foo.txt'));
//   }
// })

if (!argv.o) { argv.o = defaultDownloadPath }
if (argv.Q) { argv.q = true }

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
function print(text,force) {
  if (!argv.q) console.log(`${nlc()}${" INFO ".bgCyan.black} ${text.cyan}`)
}
function printResult(result) {
  if (!argv.q) console.log(`${nlc()}${" RESULT ".bgGreen.white} ${`${result}`.green}`)
}
function printError(text) {
  console.log(`${nlc()}${" ERROR ".bgRed.black} ${text.red}`)
}

// function getFileExt(mime) {
//   console.log(mime)
//   switch (mime) {
//     case "audio/mpeg": return '.mp3'
//     case "audio/ogg": return '.ogg'
//     case "audio/wav": return '.wav'
//     case "audio/vnd.wav": return '.wav'
//     default: return '.mp3'
//   }
// }

var isFirstSet = true
var disableSpinner = false
function setSpinnerText(text) {
  if (argv.Q || disableSpinner) return
  // nlNextPrint = true
  function gt(spn) { return (`[${spn.yellow}`.green+`]`.green+` ${text}`.cyan).padEnd(150," ") }
  // loadingSpinner.stop()
  // console.log()
  // if (isFirstSet) {
  //   isFirstSet = false
  loadingSpinner.setSequence(
    [
      gt("|    "),
      gt(" )   "),
      gt("  )  "),
      gt("   ) "),
      gt("    |"),
      gt("   ( "),
      gt("  (  "),
      gt(" (   "),
    ]
  )
  // }
  // process.stdout.write((` ${text}`.cyan).padEnd(50," "))
  // loadingSpinner.setText(text)
  // print(text)
  // loadingSpinner.start(75,{
  //   clearLine: true,
  //   hideCursor: true,
  // })
}
function startSpinner(text) {
  if (argv.Q || disableSpinner) return
  nlNextPrint = true
  if (text) setSpinnerText(text)
  loadingSpinner.start(75,{
    clearLine: true,
    hideCursor: true,
    doNotBlock: true
  })
}
function stopSpinner() {
  if (argv.Q || disableSpinner) return
  loadingSpinner.stop()
}

function r() { // Because await doesn't work in the top level
  return new Promise(async (resolve,reject) => {
    var got = await import('got')

    function getJSON(url) { // Shorthand for JSON.parse((await got.got(url)).body)
      return new Promise(async (resolve,reject) => {
        got.got(url).then((result) => {
          try { resolve(JSON.parse(result.body)) }
          catch(err) { reject(err) }
        }).catch(reject)
      })
    }
    function getBody(url,raw) { // Shorthand for (await got.got(url)).body/rawBody
      return new Promise(async (resolve,reject) => {
        got.got(url).then((result) => {
          try { resolve( raw ? result.body : result.rawBody ) }
          catch(err) { reject(err) }
        }).catch(reject)
      })
    }
    
    // "This is where the fun begins."
    function downloadAudioAsset(str,dlnum) {
      return new Promise(async (resolve,reject) => {
        if (!dlnum) dlnum = "1/1" // Default to 1/1 for directly downloading single IDs

        // Parse asset ID strings
        verbose(`parsing asset ID from string "${str}"`)
        var audioId = /(?:rbxassetid:\/\/)?(?:(?:https?:\/\/)?(?:www\.)?roblox.com\/(?:asset\?id=)?(?:library\/)?)?(\d+)/g.exec(str)[1]
        if (!audioId) { reject("invalid asset ID"); return } // ID couldn't be parsed out of the string

        // Print to show progress (especially in -A)
        print(`downloading asset ${dlnum}: ${audioId}`)
        
        // Download the asset's library page so we can pull all the data we need out of it
        startSpinner(`asset ${dlnum} - getting page html`)
        verbose(`getting page html`)
        var pageHTML = await getBody(`https://www.roblox.com/library/${audioId}/`)

        // Update spinner text
        setSpinnerText(`asset ${dlnum} - reading data from page`)
        verbose(`pulling metadata from page html`)
        
        // If we're going to use it, pull the name from the end of the URL roblox gives us
        if (!argv.s && !argv.F) {
          var safe_filename = /"canonical" href="https:\/\/www.roblox.com\/library\/\d+\/([\w\d-_]+)"/g.exec(pageHTML)[1]
          verbose(`got safe filename: ${safe_filename}`)
        } else verbose(`not getting safe filename as it won't be used (${argv.s?"--short-filename":"--full-filename"})`)

        // Grab the full asset name for -F and the error message shown when there isn't an audio preview
        var real_name = /data-item-name="(.*)"/g.exec(pageHTML)[1]
        verbose(`got full asset name: ${real_name}`)

        var mediathumb_result = /data-mediathumb-url="([\w\d:/.]+)"/g.exec(pageHTML)
        // If this isn't defined, we don't have the download link, so throw an error
        if (!mediathumb_result) { reject(`asset ${audioId} ("${real_name}") had no audio preview (moderated or not an Audio asset..?)`); return }
        var mediathumb = mediathumb_result[1]
        verbose(`got mediathumb url: ${mediathumb}`)
        
        // Generate the base filename.
        // If -F is being used, remove any invalid characters from the filename.
        var name = `${audioId}${argv.s?``:' ' + (argv.F ? real_name.replace(/["<>\/\\|:?*]/g,"_") : safe_filename)}`
        verbose(`built base filename: ${name}`)

        verbose(`actually downloading: ${mediathumb}`)
        setSpinnerText(`asset ${dlnum} - downloading data`)
        // Download the file (for real this time) (finally!)
        var fileData = await getBody(mediathumb, true)
        // We have the file! Suprise moderations can't touch us now!
        verbose(`downloaded! now checking file format`)

        setSpinnerText(`asset ${dlnum} - checking file format`)
        // Roblox servers' ability to identify filetypes is as bad as their moderators' ability to identify what actually breaks the rules.
        // Or, in technical terms: Figure out the MIME type on our end, because the Content-Type header Roblox gives us is unreliable.
        var ftype = await fileTypeFromBuffer(fileData.data)
        verbose(`file format found - ${ftype.mime} (.${ftype.ext})`)
        
        // Figure out where we're going to save the file to
        var filename = name + '.' + ftype.ext
        var outPath = path.join(argv.o,filename)
        verbose(`built output path: ${outPath}`)

        setSpinnerText(`asset ${dlnum} - saving file`)
        fs.writeFileSync(outPath,fileData.data)

        resolve(`file successfully downloaded as ${outPath}`) // 🎉
        stopSpinner()
      })
    }

    function howLongWillThisTake(items) { // Spice up the output a little :)
      if (items > 2000) return 'this is going to take an eternity (why are you even downloading this many assets???)' // Seriously, what the hell?
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

        if (Math.round(userId) != userId) {reject('user ID must be an integer'); return} // Because JS doesn't have an integer type.

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
          // 50 items/page seems to be a little faster than 100, so we'll use that for now
          var data = await getJSON(`https://inventory.roblox.com/v2/users/${userId}/inventory/3?sortOrder=Asc&limit=50${nextCursor?`&cursor=${nextCursor}`:''}`)
          nextCursor = data.nextPageCursor // Roblox api pages are WEIRD
          verbose(`got page - found ${items.length} items`)
          items = items.concat(data.data)
          pagenum++
        }
        
        verbose(`getting list of inventory items`)
        await getNextInventoryPage() // Get the first page so we know if there's any more
        while (nextCursor) await getNextInventoryPage() // Get all subsequent inventory pages

        print(`downloading ${items.length} assets - ${howLongWillThisTake(items.length)}`)

        // This is the only way I could get await to work
        function dl(i) {
          return new Promise((resolve,reject) => {
            downloadAudioAsset(items[i].assetId,`${i+1}/${items.length}`).then((result) => {
              stopSpinner()
              printResult(result)
              resolve()
            }).catch((reason) => {
              if (!argv.q) printError(`failed to download asset ${items[i].assetId}: ${reason}`)
              resolve() // Don't cause an unhandled exception, let the other assets download too >:(
            })
          })
        }

        if (argv.A) {
          stopSpinner() // Disable the spinner because it has a stroke with async
          disableSpinner = true
          for (var i = 0; i < items.length; i++) { dl(i) }
        } else {
          for (var i = 0; i < items.length; i++) { await dl(i) }
        }
      })
    }
    
    function downloadFile(fileName) { // Download from a list file. See downloadAudioAsset() for ID downloading.
      print(`downloading ids from file ${userId}`)
      return new Promise(async (resolve,reject) => {
        startSpinner(`list dl - checking file`)

        if (!fs.existsSync(path.resolve(fileName))) { reject('file does not exist'); return }
        var txt = fs.readFileSync(path.resolve(fileName))
        // Make sure it's actually a text file because splitting an image by newlines is probably a bad idea
        if (!typeof txt === 'string') { reject('not a text file'); return }
        var ids = txt.split('\n')
        
        print(`downloading ${items.length} assets - ${howLongWillThisTake(items.length)}`)

        function dl(i) {
          return new Promise(async (resolve,reject) => {
            downloadAudioAsset(ids[i],`${i+1}/${items.length}`).then((result) => {
              stopSpinner()
              printResult(result)
              resolve()
            }).catch((reason) => {
              if (!argv.q) printError(`failed to download asset ${ids[i]}: ${reason}`)
              resolve() // Don't cause an unhandled exception, let the other assets download too >:(
            })
          })
        }

        if (argv.A) {
          stopSpinner() // Disable the spinner because it has a stroke with async
          disableSpinner = true
          for (var i = 0; i < ids.length; i++) { dl(i) }
        } else {
          for (var i = 0; i < ids.length; i++) { await dl(i) }
        }
      })
    }

    verbose(`output directory: ${argv.o}`)
    if (!fs.existsSync(argv.o)) { reject("output path does not exist"); return }

    if (argv.F && argv.s) { reject("-F (--full-filename) and -s (--short-filename) are mutually exclusive"); return }

    // JavaScript is an abomination. This has no right to even exist, let alone work.
    if ((new Boolean(argv.f) + new Boolean(argv.u) + new Boolean(argv.i)) > 1) { reject("-u (--user), -i (--item), and -f (--file) are mutually exclusive") }

    if (argv.u) downloadUser(argv.u).then(resolve).catch(reject) // Inventory
    else if (argv.f) downloadFile(argv.f).then(resolve).catch(reject) // List file
    else if (argv.i) downloadAudioAsset(argv.i).then(resolve).catch(reject) // Single files
    else reject("Specify either a user ID, newline-separated list file, or asset ID (-u 1234567 OR -f foo.txt OR -i 9876543)")
  })
}

r()
.then((result) => {
  stopSpinner()
  printResult(result)
  process.exit(0)
})
.catch((error) => {
  stopSpinner()
  printError(error)
  process.exit(1) // Exit codes :)
})

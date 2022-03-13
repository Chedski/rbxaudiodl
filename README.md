# What is this?
If you're here, I assume you've probably heard of the ["changes"](https://devforum.roblox.com/t/action-needed-upcoming-changes-to-asset-privacy-for-audio/1701697) Roblox is making to how audio works.  
Since many developers will need to reupload hundreds or even thousands of audio files within this short 2 week time period (spoiler alert: they REALLY aren't getting enough time), you're probably going to have to download a lot of that audio for archival until upload limits begin to reset.  
This script can download audio in bulk from Roblox, using a .txt list of IDs or even a user's entire inventory.  
# Prerequisites
There's a few things you need in order to use this, such as Node.js and knowing how to open a terminal. If you already have Node and some basic terminal knowledge, you can skip to the [Usage](#usage) section (don't forget to run `npm ci`).  
First off, if you don't already have Node.js, [download it](https://nodejs.org/en/download/) and then run the installer. For most Roblox developers, the standard Windows/MacOS installer should work fine.  
#### Make sure that you check the option in the installer for NPM, because this won't work otherwise!

If you're on Linux, it'll probably be easier to install it through your distribution's package manager, such as `apt`.  
Once you have Node installed, download the source code from the [releases page](https://github.com/Chedski/rbxaudiodl/releases) and extract the zip file into a folder.  
If you're on Windows, go into the folder, hold Shift, right click on the background, and then press "Open PowerShell window here".  
If you're on a Mac, open the Terminal app, type "`cd `" (without quotes, and the trailing space is important!), drag the folder into the window, and press enter.  
You should now have a terminal window open. In that window, type `npm ci` and press enter.  
Wait for it to complete. (You only need to do this once)
# Usage
## Bulk Downloading
This script's main purpose is to allow developers to quickly and efficiently download large quantities of sound effects. As such, I've tried my best to make bulk audio downloads as simple and easy-to-understand as possible.  
If you just want to download your (or someone else's) audio inventory, you can use this command: (Inventory must be *public*)
```
node rbxaudiodl.js -u (user id) [options]
node rbxaudiodl.js -u 38912959
node rbxaudiodl.js -u 38912959 -FA
node rbxaudiodl.js -u 38912959 -Ao "C:\Users\Basil\Desktop\audio_download_example"
```
If you have a list of audio assets you want to download, you can list them, one per line, in a text file. For example:
```
rbxassetid://151915559
https://www.roblox.com/library/4814050595/Hinkik-Time-Leaper-full
1280010741
roblox.com/asset/?id=1280010741
```
Most common Roblox ID formats (such as rbxassetid, library links, raw IDs, and legacy asset links) are supported for list files. To download the audio assets listed in a file, use this command:
```
node rbxaudiodl.js -f (file) [options]
node rbxaudiodl.js -f list.txt
node rbxaudiodl.js -f list.txt -FA
node rbxaudiodl.js -f list.txt -Ao "/home/chedski/Desktop/audio_download_example/"
```
#### Bulk downloads can be made significantly faster by using the `-A` option, however this carries a small risk of rate limiting.
## Individual Downloading
Individual assets can be downloaded too! This supports the same ID formats as the file list does.
```
node rbxaudiodl.js -i (audio ID) [options]
node rbxaudiodl.js -i 151915559
node rbxaudiodl.js -i "rbxassetid://151915559" -Qso "/home/chedski/Desktop/example_folder"
node rbxaudiodl.js -i "https://www.roblox.com/library/151915559/Terraria-Boss-2" -Fq
node rbxaudiodl.js -i "https://www.roblox.com/asset/?id=151915559" -o "C:\Storage\Audio"
```
## Options
All of the things you can use for `[options]`. Single letters without arguments can be combined into a single flag, and the last option in a flag can have an argument (`-QvAf list.txt`). Don't include the square brackets!
```
-o  Use -o <path> to change the folder that files download to
-A  Download all assets simultaneously, instead of one-by-one. Faster, but may lead to ratelimiting.
-s  Short filename. Names the file with just the ID, instead of ID and name.  
      eg. '151915559.mp3' vs '151915559 Terraria-Boss-2.mp3')
-F  Full filename. Uses the full audio name for the file, allowing ANY valid characters.
      eg. '151915559 Terraria - Boss 2.mp3' vs '151915559 Terraria-Boss-2.mp3')
-q  Disable "Info" messages. Not much else to say here.
-Q  Disable ALL output. This includes the progress spinner.
-v  Verbose output. Explains, in detail, every single thing the script is doing.

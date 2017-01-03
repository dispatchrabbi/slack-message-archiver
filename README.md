slack-message-archiver
=========
Save messages from a Slack channel to an archive.
Messages are saved to an XML file and files are downloaded to a subfolder. Simple styles provided via XSL. Optionally archives to ZIP file.


## Installation
```
npm install slack-message-archiver
```

## Usage  
  
```js
const archiver = require('slack-message-archiver');

archiver.save(token, channel, [options], [callbackFunc]);
```  
  
## Input
  ```
  token           Slack API token. Get one here: https://api.slack.com/web  
  channel         Channel to archive, e.g. #general
  
  options         [all parameters are optional]
  {
  
// mininum message datestamp (inclusive)
// must be parseable, e.g. YYYYMMDD or MM/DD/YYY or YYYY-MM-DD.  
    from:         '20160915',
	
// max message datestamp (inclusive)
// must be parseable, e.g. YYYYMMDD or MM/DD/YYY or YYYY-MM-DD.	
    to:           '10/01/2016', 
	
// folder to write to
// if omitted, writes to current folder		
    dir:          '/tmp', 
	
// stylesheet that the messages xml will be styled with. 
// if omitted, uses basic slack-message-archive.xsl (provided)	
    xsl:          'foo.xsl',
	
// maximum number of concurrent file downloads of files
// associated with messages
// default is 2. YMMV.	
    concurrency:  2, 
	
// whether progress information should be logged to console
// default is false.	
    logToConsole: false,

// whether to create a zip archive of the messages xml, xsl, and files
// default is false;	
	zip:          false 
  }  

  calbackFunc	function executed upon completion, with these parameters:
    err			  error, if applicable
	results		  object containing result data
  ```

## Results format passed to callback function

If successful, the supplied callback function is provided an object literal with information about the result of the archive process. Example:

```js
{ channel: 'general',
  from: 'Thursday, September 15th 2016, 12:00 am',
  to: 'Saturday, October 1st 2016, 12:00 am',
  writeFolder: 'C:\\somePath',
  filename: 'archive_general__20160915-20161001.xml',
  messages: 155,
  files: 7,
  archivePath: 'C:\\somePath\\archive_trades__20160915-20161001.zip',
  archiveFile: 'archive_general__20160915-20161001.zip'
}
```
  
## Contributing

Fork and submit pull requests. This code can be improved! GitHub repo: https://github.com/tomsherman/slack-message-archiver

## Issues/Features requests

Open issue here: TBD
'use strict'

// requirements
	const execSync = require('child_process').execSync;
	const fs = require('fs-extra');
	const json2xml = require('json2xml');
	const moment = require('moment');
	const os = require('os');
	const path = require('path');
	const request = require('request');
	const Slack = require('slack-node');
	const zipFolder = require('zip-folder');

// defaults	
	const DEFAULT_CONCURRENT_FETCHES = 2;
	const DEFAULT_LOG_TO_CONSOLE = false;
	const DEFAULT_FROM = moment(0);
	const DEFAULT_TO = moment(2147483647*1000); // the future, way in the future
	const DEFAULT_XSL = "slack-message-archive.xsl";	
	const DEFAULT_ZIP = false;	
	const FILES_SUBFOLDER_NAME = "files";	
	const NOOP = function() { return; };
	
// public methods	

	var save = function(token, channel, options, finishFunc) {
		if (!token) throw 'token is required';
		if (!channel) throw 'channel is required';
			
		// massage inputs
		// tack required inputs onto options for ease of passing among functions		
		options = options || {};
		options.channel = channel.replace("#", "");
		options.token = token;
		
		options.from = options.from ? moment(new Date(options.from)) : DEFAULT_FROM;
		options.to = options.to ? moment(new Date(options.to)) : DEFAULT_TO;
		options.filename = getFilename(options); 			
		options.dir = options.dir ? path.resolve(options.dir) : __dirname;	
		
		options.xsl = options.xsl || DEFAULT_XSL;
		options.concurrency = options.concurrency || DEFAULT_CONCURRENT_FETCHES;
		options.logToConsole = typeof options.logToConsole !== "undefined" ? options.logToConsole : DEFAULT_LOG_TO_CONSOLE; 
		options.zip = typeof options.zip !== "undefined" ? options.zip : DEFAULT_ZIP;

		options.finishFunc = finishFunc || NOOP;		
		
		if (options.zip) {
			// create temp folder for xml, xsl, and files		
			// the entire folder gets zipped		
			options.tmpDir = path.join(os.tmpdir(), 'slack-message-archiver' + Math.round(Math.random() * 10000000));
		} else {
			// no need for subfolder
			options.tmpDir = options.dir;		
		}
		options.filesSubdirName = options.filename + '_files';	
		options.filesSubdir = path.join(options.tmpDir, options.filesSubdirName);
		options.filesDir = path.join(options.filesSubdir, FILES_SUBFOLDER_NAME);

		getChannel(options);
	};

// private methods	

	var getFilename = function(options) {
		var filename = 'archive_' + options.channel

		switch (true) {
			case options.from.isSame(DEFAULT_FROM) && options.to.isSame(DEFAULT_TO):
				// no suffix
				break;
			
			case options.from.isSame(DEFAULT_FROM):			
				filename += '__to_' + options.to.format('YYYYMMDD');
				break;
			
			case options.to.isSame(DEFAULT_TO):			
				filename += '__from_' + options.from.format('YYYYMMDD');
				break;			
			
			default:
				filename += '__' + options.from.format('YYYYMMDD') + '-' + options.to.format('YYYYMMDD');
				break;
		}	
		
		return filename;
	};

	var getChannel = function(options) {
		
		var rand = Math.round(Math.random() * 10000000);

		var tmpPath = "tmp_" + rand + ".json";
		var cmdTxt = 'slack-history-export -t ' + options.token + ' -c ' + options.channel + ' -F json -f ' + tmpPath;
		execSync(cmdTxt);
			
		var tmpFile = fs.readFileSync(tmpPath, 'utf8');			
		var channelHistory = JSON.parse(tmpFile);
		
		fs.unlinkSync(tmpPath);
		
		var filteredHistory = filterHistory(channelHistory, options);
		
		if (filteredHistory.length === 0) {
			var err = new Error('no messages found');
			options.finishFunc(err);
			return;
		}
		
		if (options.logToConsole) console.log('found ' + filteredHistory.length + ' messages in specified date range');
		
		processFiles(filteredHistory, options);
	};

	var filterHistory = function(channelHistory, options) {
		var filteredHistory = [];
		
		channelHistory.forEach(function(m) {
			var d = moment(1000*m.ts);
			
			if (d.isBefore(options.from) || d.isAfter(options.to)) return;
			
			filteredHistory.push(m);
		});	
		
		return filteredHistory;
	};

	var processFiles = function(history, options) {
	
		fs.mkdirpSync(options.tmpDir)
		fs.mkdirpSync(options.filesSubdir)
		fs.mkdirpSync(options.filesDir);
				
		var files = getFileUrls(history);	

		var outputFunc = function() {
			writeOutput(history, options);
		}

		if (files.length > 0) {
			if (options.logToConsole) console.log("beginning fetch of " + files.length + " files");
			fetchFiles(options, files, outputFunc);		
		} else {
			// no files, just write output
			if (options.logToConsole) console.log("no files to download");
			outputFunc();
		}
		
	};

	// Given a set of image URLs, preloads them with the options.concurrency number of fetchers
	var fetchFiles = function(options, files, outputFunc) {
			
		// create queues
		options.filesToFetch = files; // ordered list of file objects (Slack API format)
		options.filesBeingFetched = {}; // key: file.id, val: file		
		
		var len = Math.min(options.concurrency, options.filesToFetch.length);
				
		for (var i=0; i < len; i++) {	
			var file = options.filesToFetch.shift();
			startFileFetch(file, options, outputFunc);
		}

	};
	
	// Instantiates a JavaScript Image loader, relying on the onload event
	// to load further URLs.
	var startFileFetch = function(file, options, outputFunc) {
		var nextFunc = getNextFunc(file, options, outputFunc);
		fetch(file, options, nextFunc);
	};
	
	var getNextFunc = function(file, options, outputFunc) {
	
		return function() {						
			delete options.filesBeingFetched[file.id]; // we're done with the current URL
			
			if (options.filesToFetch.length > 0) {	
				var nextFile = options.filesToFetch.shift(); // first (oldest) URL in the queue
				var nextFunc = getNextFunc(nextFile, options, outputFunc);
				fetch(nextFile, options, nextFunc);
			} else if (options.filesToFetch.length === 0 && keys(options.filesBeingFetched).length === 0) {
				// done!
				if (options.logToConsole) console.log("finished downloading");
				outputFunc();
			} else {
				// let the other fetcher finish
			}
		};		
	};
	
	var getFileUrls = function(hist) {
		var files = [];
		
		hist.forEach(function(message) {
			if (message.file && message.file.url_private_download) files.push(message.file);
		});
		
		return files;
	};	
	
	var fetch = function(file, options, callback) {
		options.filesBeingFetched[file.id] = true; // indicate this file URL is in-flight		
	
		var reqOptions = {
		  uri: file.url_private_download,
		  headers: {
			Authorization: 'Bearer ' + options.token
		  }
		};
	
		request(reqOptions).pipe(fs.createWriteStream(options.filesDir + file.id + '.' + file.filetype)).on('close', function() {
			callback();
		});	
	};
	
	var writeOutput = function(history, options) {
		
		var slack = new Slack(options.token);		
		slack.api("users.list", function(err, response) {  
		  // create lookup dictionary
		  var users = {};
		  for (var i=0; i<response.members.length; i++) {
			var r = response.members[i];
			users[r.id] = {
				id: r.id
				, name: r.name
				, real_name: r.real_name
				, image: r.profile.image_32
			};
		  }
		  
		  createArchive(history, users, options);
		});
		
	};
		  
				
	var createArchive = function(history, users, options) {
		var userId2NameSwaps = [];		
		var user2image = {};
		
		var writeObj = {
			history: {
				channel: options.channel
				, from: options.from.format("dddd, MMMM Do YYYY, h:mm a")
				, to: options.to.format("dddd, MMMM Do YYYY, h:mm a")
				, messages: []
				, fileCount: 0
			}
		};			
	
		for (var user in users) {
			userId2NameSwaps.push({
				regex: new RegExp('<@' + users[user].id + '>')
				, username: '@' + users[user].name
			});	
			
			user2image[users[user].name] = users[user].image;
		}

		history.forEach(function(m) {
			if (m.type === "message" && /<@[A-Z0-9]+>/.test(m.text)) {
				userId2NameSwaps.forEach(function(swap) {
					m.text = m.text.replace(swap.regex, swap.username);
				});
			}		
		
			m.profile_image = user2image[m.user];
			m.formatted_date = moment(1000*m.ts).format('MMMM Do YYYY, h:mm a');
			
			//  <@U07DYET08|swift2.0> uploaded a file: <https://irclove.slack.com/files/swift2.0/F2A7BEMN2/pasted_image_at_2016_09_09_07_04_pm.png|You do know he's suspended all season right?> 
			if (m.file) {
				m.text = m.text.replace(/^<@[A-Z0-9]+\|([^>]+)>/, '@$1');
				var r = /<https:\/\/[^|]+\|([^>]+)>/i;
				var matches = m.text.match(r);
				m.file_path = options.filesSubdirName + '/files/' + m.file.id + '.' + m.file.filetype;
				m.file_label = matches[1];
				m.text = m.text.replace(r, '') + ' ';
				writeObj.history.fileCount += 1;
			}
		
			writeObj.history.messages.push({
				message: m
			});
		});
						
		// create xml file with reference to stylesheet
		var xmlFilePath = path.normalize(options.tmpDir + "/" +  options.filename + ".xml");
		fs.writeFileSync(xmlFilePath, '<?xml version="1.0" encoding="UTF-8" ?><?xml-stylesheet type="text/xsl" href="' + options.filesSubdirName + '/' + options.xsl + '" ?>' + json2xml(writeObj));
		
		// copy stylesheet into temp folder
		fs.copySync(path.normalize(__dirname + '/' + options.xsl), path.normalize(options.filesSubdir + '/' + options.xsl));	
	
		if (options.zip) {
			zipItUp(writeObj, options);
		} else {
		
		
			var result = getResult(writeObj, options);
			// success!
			options.finishFunc(null, result);				
		}
			
	};
	
	var zipItUp = function(writeObj, options) {
		var zipFilename = options.filename + '.zip';
		var zipFile = path.join(options.dir, zipFilename);
		
		zipFolder(options.tmpDir, zipFile, function(err) {
			if(err) {
				options.finishFunc("problem with zipFolder", err);
			} else {
				
				// delete the temp folder
				fs.removeSync(options.tmpDir);
				
				var result = getResult(writeObj, options);
				
				// tack on zip file info
				result.archivePath = zipFile;
				result.archiveFile = zipFilename;
				
				// success!
				options.finishFunc(null, result);				
			}
			
		});		
	}
	
	var getResult = function(writeObj, options) {	
		return {
			channel: options.channel
			, from: writeObj.history.from
			, to: writeObj.history.to			
			, writeFolder: options.dir
			, filename: options.filename + '.xml'
			, messages: writeObj.history.messages.length			
			, files: writeObj.history.fileCount
		};	
	};
	
// utility functions
	
	var keys = function(obj){
		var properties = [],
			property;

		for (property in obj){
			if (has_own_property(obj,property)){
				properties[properties.length] = property;
			}
		}

		return properties;
	};	

	var has_own_property = function(obj, prop){
		if (obj.hasOwnProperty){
			if (obj.hasOwnProperty(prop)){
				return true;
			} else {
				return false;
			}
		} else {
			return true;
		}
	};		
	
	
// exports
module.exports = {
	save: save
};
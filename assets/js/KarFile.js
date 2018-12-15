

function KarFile(){
	var file;
}


KarFile.prototype.readFileInput=function(file,onload){
	var karfile=this;
	karfile.fileName=file.files[0].name.split(".")[0];
	this.readBlob(file.files[0],onload);
}

KarFile.prototype.readUrl=function(url,onload) {
	var oReq = new XMLHttpRequest();
	var karfile=this;
	var link=document.createElement("A");
	link.href=url;
	console.log(link.path);
	karfile.fileName=url;
	oReq.open('GET', url, true);
	oReq.responseType = 'arraybuffer';
	oReq.onload = function(oEvent) {
		karfile.readBuffer(oReq.response);
		onload(karfile,oReq.response);
	};
	oReq.send(null);
}

KarFile.prototype.readBlob=function (blob,onload){
	var reader = new FileReader();
	var karfile=this;
	
    reader.onload = function(loadedEvent) {
		console.log("Loaded");
		var buffer=(loadedEvent.target.result);
		karfile.readBuffer(buffer);
		onload(karfile);
	}
	reader.onprogress=function(progress){
		console.log("Progress: "+progress.loaded+"/"+progress.total);
	}
	reader.onerror=function(error){
		console.log("Error: ");
		console.log(error);
	}
	reader.readAsArrayBuffer(blob);
}

KarFile.prototype.readBuffer=function (buffer){
	var midiFile = new MIDIFile(buffer);
	this.midiFile=midiFile;
	
	this.midiData={
		format:midiFile.header.getFormat(),// 0, 1 or 2
		trackCount:midiFile.header.getTracksCount(), // n
		timeDivision:midiFile.header.getTimeDivision(),		
	}
	
	// Time division
	if(midiFile.header.getTimeDivision() === MIDIFileHeader.TICKS_PER_BEAT) {
		this.midiData.ticksPerBeat=midiFile.header.getTicksPerBeat();
	} else {
		this.midiData.frames=midiFile.header.getSMPTEFrames();
		this.midiData.ticksPerFrame=midiFile.header.getTicksPerFrame();
	}
	
	
}

KarFile.prototype.readEvents=function(){
	this.MIDIEvents=this.midiFile.getMidiEvents();
	this.trackEvents=[];
	for(var idx in this.MIDIEvents){
		var ev=this.MIDIEvents[idx];
		if (!this.trackEvents[ev.track]){
			this.trackEvents[ev.track]=[];
		}
		this.trackEvents[ev.track].push(ev);
	}
	return this.trackEvents;
}

KarFile.prototype.convertText=function(txt){
	return txt.replace("\\","\n").replace("/","\n");
}

KarFile.prototype.getText=function(){
	this.textEvents=this.midiFile.getLyrics();
	this.text=[];
	
	for(var idx in this.textEvents){
		var ev=this.textEvents[idx];
		if (!this.text[ev.track]){
			this.text[ev.track]="";
		}
		this.text[ev.track]+=this.convertText(ev.text);
	}
	return this.text;
}

KarFile.prototype.addLyrics=function(stime,line,trk,parts){
	if (!this.trackLines){
		this.trackLines=[];
	}
	if (this.trackLines.length==0){
		var itime=Math.max(1,stime-5000);
		var diff=Math.floor((stime-itime)/5);
		var introParts=[
			{time:itime,text:"*"},
			{time:itime+diff*1,text:"*"},
			{time:itime+diff*2,text:"*"},
			{time:itime+diff*3,text:"*"},
			{time:itime+diff*4,text:"*"}
			];
		if (line.trim()==""){
			stime=itime;
			line="*****";
			parts=introParts;
		}else{
			this.trackLines.push({time:itime,text:"*****",track:trk,parts:introParts});
		}
	}	
	this.trackLines.push({time:stime,text:line,track:trk,parts:parts});

}

KarFile.prototype.getLyrics=function(){
	if (!this.textEvents){
		this.textEvents=this.midiFile.getLyrics();	
	}
	var trackLyrics=[];
	for(var idx in this.textEvents){
		var ev=this.textEvents[idx];
		var text=this.convertText(ev.text);
		var time=Math.round(ev.playTime);
		if (!trackLyrics[ev.track]){
			trackLyrics[ev.track]=[];
		}
		trackLyrics[ev.track].push({text:text,time:time});
	}
	
	for(var trk in trackLyrics){
		var parts=[];
		var line="";
		var startTime=0;
		var lyrics=trackLyrics[trk];
		for(var idx in lyrics){
			var time=lyrics[idx].time;
			var text=lyrics[idx].text;
			if (text.charAt(0)=="\n"){
				var stime=parts.length>0?parts[0].time:time;
				
				this.addLyrics(stime,line,trk,parts);
				parts=[];
				startTime=0;
				line="";
				text=text.substring(1);
			}
			if (startTime==0){
				startTime=time;
			}
			line+=text;
			parts.push({time:time,text:text});
			if (line.charAt(line.lenght-1)=="\n" && parts.length>0){
				time=parts[0].time;
				this.addLyrics(time,line,trk,parts);
				startTime=0;
				parts=[];
				line="";
			}
		}
	}
	this.trackLyrics=trackLyrics;
	return this.trackLines;
}


//https://gist.github.com/jonleighton/958841
function base64ArrayBuffer(arrayBuffer) {
  var base64    = ''
  var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

  var bytes         = new Uint8Array(arrayBuffer)
  var byteLength    = bytes.byteLength
  var byteRemainder = byteLength % 3
  var mainLength    = byteLength - byteRemainder

  var a, b, c, d
  var chunk

  // Main loop deals with bytes in chunks of 3
  for (var i = 0; i < mainLength; i = i + 3) {
    // Combine the three bytes into a single integer
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

    // Use bitmasks to extract 6-bit segments from the triplet
    a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048)   >> 12 // 258048   = (2^6 - 1) << 12
    c = (chunk & 4032)     >>  6 // 4032     = (2^6 - 1) << 6
    d = chunk & 63               // 63       = 2^6 - 1

    // Convert the raw binary segments to the appropriate ASCII encoding
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
  }

  // Deal with the remaining bytes and padding
  if (byteRemainder == 1) {
    chunk = bytes[mainLength]

    a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

    // Set the 4 least significant bits to zero
    b = (chunk & 3)   << 4 // 3   = 2^2 - 1

    base64 += encodings[a] + encodings[b] + '=='
  } else if (byteRemainder == 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

    a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
    b = (chunk & 1008)  >>  4 // 1008  = (2^6 - 1) << 4

    // Set the 2 least significant bits to zero
    c = (chunk & 15)    <<  2 // 15    = 2^4 - 1

    base64 += encodings[a] + encodings[b] + encodings[c] + '='
  }
  
  return base64
}


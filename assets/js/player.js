
navigator.requestMIDIAccess().then( MIDIOpen, MIDIError );
var midiObj=null;
var midiPlayer=null;
var midiOut=null;

function MIDIOpen(midi){
	console.log("OK");
	midiObj=midi;
	var iter = midiObj.outputs.values();
	var output;
	while(output = iter.next()) {
		if(output.done) {
		  break;
		}
		window.onerror(output+" "+output.value.id+":"+output.value.name);
		midiOut=midiObj.outputs.get(output.value.id);
		console.log(midiOut);
	}

}

function MIDIError(e){
	console.log(e);
}

function readKar(file){
	if (file){
		var k=new KarFile();
		k.readFileInput(file,loadKar);
	}
}


var start=null;
var lyrics=null;
var container=document.getElementById("karaoke");
var footer=document.getElementById("footer-text");

function loadKar(kar){
	footer.innerHTML=kar.fileName;
	lyrics=kar.getLyrics();
	console.log(kar);
	console.log(lyrics);
	startTime();
	drawKaraoke();
}

function loadText(kar){
	var lyricsText=kar.getText();
	var res=document.getElementById("result");
	res.innerText="";
	for(var trk in lyricsText){
		res.innerText+="Track "+trk+"\n";
		res.innerText+=lyricsText[trk];
		res.innerText+="\n\n";
	}
}


function startTime(){
	start=(new Date()).getTime();
}

function drawKaraoke(){
	var lastIndex=0;
	var time;
	var currentLyric;
	var lyric;
	var part;
	var current=new Date();
	current=current.getTime()-start;
	if (player){
		current=Math.round(player.getPosition()*1000);
	}
	if (!lyrics){
		console.log("No lyrics");
		lyrics=[
			{
				time: 0, text: "No lyrics found", track: "0",
				parts: [
					{
						time: 0,
						text: "No lyrics found"
					}
				]
			}
		]
	}
	for(var index=0;index<lyrics.length;index++){
		lyric=(lyrics[index]);
		time=lyric.time;
		if (time>=current){
			lyric=(lyrics[index-1]);
			var active="";
			var inactive="";
			var preactive="";
			var lastactive="";
			if(lyric){
				for(var idx in lyric.parts){
					part=lyric.parts[idx];
					if (part.time<=current){
						preactive=active;
						lastactive=part.text;
						active+=part.text;
					}else{
						inactive+=part.text;
					}
				}
			}
			container.innerHTML="";
			if (index-2>=0){
				container.innerHTML+="<span class=next>"+lyrics[index-2].text+"</span><br>";
			}
			container.innerHTML+="<span class=active>"+preactive+"</span>";
			container.innerHTML+="<span class='active last'>"+lastactive+"</span>";
			container.innerHTML+="<span class=inactive>"+inactive+"</span>";
			if (index<lyrics.length){
				container.innerHTML+="<br><span class=next>"+lyrics[index].text+"</span>";
			}
			break;
		}
		lastIndex=index;
	}
	setTimeout(drawKaraoke,200);
}


function play(midiFile){
	try{
		player = new MIDIPlayer('inputfile');
		// creating the MidiFile instance from a buffer (view MIDIFile README)
		player.onload=function(song){
			player.play();
		}
		player.openFile(midiFile);
		console.log('Playing ',midiFile);
	} catch(e) {
		console.log('No access to MIDI output.', e);
		window.onerror("No MIDI acess "+midiObj.outputs);
	}

}
 
function stop(){
	if(midiPlayer) {
		midiPlayer.stop();
	}
}

function playUrl(path,name){
	var url=path+name;
	var k=new KarFile();
	var parts = name.split('.')
	parts.pop()
	name = parts.join('.')
	k.readUrl(url,function(kar,buffer){
		kar.fileName=name;
		loadKar(kar);
		player.openFile(buffer);
		
	});
}

window.onerror = function(msg, url, line, col, error) {
	console.log(arguments);
	err=document.createElement('div');
	err.innerText=msg+"\n"+url+":"+line+"("+col+")";
    document.body.appendChild(err);
}





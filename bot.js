const Discord = require('discord.js');
const fs = require('fs');
const fetch = require("node-fetch");
const client = new Discord.Client();

let roleData;
let allRoles = new Array();
let discordRoles = null;
client.on('ready', async () => {
	console.log(`Logged in as ${client.user.tag}!`);
	client.user.setActivity("villagers", {type: 'WATCHING'});
	roleData = JSON.parse(fs.readFileSync('roles.json'));
  
	let roleSuper = Object.values(roleData);
	let roleSub = new Array();
	roleSuper.forEach(sup => {
		roleSub = roleSub.concat(Object.values(sup));
	});
	roleSub.forEach(sub => {
		allRoles = allRoles.concat(Object.values(sub));
	});
});
client.login(JSON.parse(fs.readFileSync('loginToken.json')).token);

//The List of recognized commands
var commandWordsBasic = ["ping", "start", "play", "lynch", "help"];
var commandWordsHost = ["day", "night", "kill", "clear", "test"];
var commandWords = commandWordsBasic.concat(commandWordsHost);
var output = false;
//used to determin if there is already an active game or not.
var isActiveGame = false;
var isGameStarted = false;
var rolesIG=[];
var nominated=[];
var nomSec=[];
var nomThird=[];
//Used to determin if it is day or night
var isDay = true;
var numAlive = 0;
//Used for confirming the bots selection of roles
var rolesConfirmed = false;
var pleaseConfirm = false;
var voting = false;
var lynching = false;
var numVoted = 0;
var guilties = 0;
var innos = 0;
var abstains = 0;
var numPlayer = 0;
var nominated = [];
var numRoles = 0;
var createdMediumChannel = false;
var createdUWolfChannel = false;
//An array of all the roles that are used in the game
var skipped = false;

//This listens to every message posted in the guild, and checks to see if it is a command
client.on('message', async msg => {  

	if (discordRoles == null) {	fillDiscordRoles(msg.guild); }

	const message = msg.content;
	const channel = msg.channel;
	const user = msg.member;
	const guild = msg.guild;
	const isUserHost = user.roles.has(discordRoles.Host.id);
    
    if(createdUWolfChannel && channel == guild.channels.find(channel => channel.name === 'night-werewolf')){
        if(message.substring(0, 1) == '!'){
            guild.channels.find(channel => channel.name === 'undercover-wolf').send(" !"+message.splice(1));
        }
        else{
            guild.channels.find(channel => channel.name === 'undercover-wolf').send(message);          
        }
        
    }
    
	// Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    if (message.substring(0, 1) == '!') {
	
        var args = message.substring(1).split(' ');
        var cmd = args[0];
        cmd = cmd.toLowerCase();
		
	    //The arguments after the first word
        args = args.splice(1);

		switch(cmd) {
			// !start~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			case 'start':
				if (isActiveGame && isGameStarted) {
					channel.send(user + ", there is already an active game. Use *!play* to spectate as a ghost.");
				} 
				else if (!isActiveGame && !isGameStarted) {
					invitePlayers(guild, msg.member);
				}
				else if (isUserHost && numPlayer >= 6) {
					startGame(guild,roleData);
				} 
				else if(numPlayer >= 6){
					channel.send(user + ", you are not a host!");
				}
                else if(isUserHost){
                    channel.send(user + ", there are only ["+numPlayer+"/6] minimum required players!");
                }
                msg.delete(1000);
			break;
			// !play~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			case 'letmein':
				if (10 > Math.floor(Math.random()*100)) {
					msg.reply("No");
                    break;
				}
			case 'play':
			case 'join':
			case 'p':
			case 'j':
				if (isActiveGame && !isGameStarted && !user.roles.has(discordRoles.Town.id)){
                    numPlayer += 1;
					user.addRole(discordRoles.Town).catch(console.error);
                    if (numPlayer < 6){
                        guild.channels.find(channel => channel.name === "join-game").send(user + " has joined the lobby. ["+ numPlayer+"/6] players till the game can begin.").catch(console.error);
                    }
                    else {
                        guild.channels.find(channel => channel.name === "join-game").send(user + " has joined the lobby. ["+ numPlayer +"] players!").catch(console.error);

                    }
                    console.log(user+" has joined the lobby.");

				}
				else if (isActiveGame && isGameStarted) {
					user.addRole(discordRoles.Dead).catch(console.error);
				}
                else if (user.roles.has(discordRoles.Town.id)){
                    channel.send(user + ", you are already in the game!");
                }
				msg.delete(1000);
			break;
			// !day~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			case 'day':
				if (!isDay && isGameStarted && isUserHost) { 
					isDay = true;
                    
                    for (let channelMember of guild.channels.find(channel => channel.name === "day-voice").members) {
                        if(channelMember[1].roles.has(discordRoles.Town.id)){
                            channelMember[1].setMute(false)
                        }
                    }
                    
					guild.channels.find(channel => channel.name === "day").overwritePermissions( discordRoles.Town, 
						{ SEND_MESSAGES: true});
                    guild.channels.find(channel => channel.name === "night-werewolf").overwritePermissions( discordRoles.Everyone, 
						{ SEND_MESSAGES: false});
						
					guild.channels.find(channel => channel.name === "day").send(":sunny: The sun rises, and you wake for the day.");
				    msg.delete(1000);
				}
			break;
			// !night~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			case 'night':
				if (isDay && isGameStarted && isUserHost) {
					isDay = false;
                    
                    for (let channelMember of guild.channels.find(channel => channel.name === "day-voice").members) {
                        if(channelMember[1].roles.has(discordRoles.Town.id)){
                            channelMember[1].setMute(true)
                        }
                    }
                    
					guild.channels.find(channel => channel.name === "day").overwritePermissions( discordRoles.Town, 
						{ SEND_MESSAGES: false});
                    guild.channels.find(channel => channel.name === "night-werewolf").overwritePermissions( discordRoles.Everyone, 
						{ SEND_MESSAGES: true});
						
					guild.channels.find(channel => channel.name === "day").send(":crescent_moon: The sun sets, and you go to sleep.");
				    msg.delete(1000);

				}	
			break;
            case 'role':
                output = false;
				role = roleCheck(msg.content.slice(6));
				if (role != null) {
					printRole(role, channel);
				}
                msg.delete(1000);
            break;
            // !second~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			case 'second':
                /*
                var lynchedVillager = await guild.members.find( user => user.id ===msg.mentions.users.first().id);
                if (user.roles.has(msg.guild.roles.find(role => role.name === "Town").id) && isDay && lynchedVillager != user && !lynching) {
					var villagerRole = guild.roles.find(role => role.name === "Town");
				    var ghostRole = guild.roles.find(role => role.name === "Dead");
                    if (lynchedVillager.roles.has(villagerRole.id) && nominated.includes(lynchedVillager) && !nominated.includes([user,lynchedVillager])) {
                      //  nominated.push(lynchedVillager);
                        if (numAlive <= 8){
                            lynching == true;
                            guild.channels.find(channel => channel.name === "day").send(user + " has seconded! "+lynchedVillager.toString()+" has 30sec to make their case!");
                            nominated = [];
                            for (let channelMember of guild.channels.find(channel => channel.name === "day-voice").members) {
                                if(channelMember[1].roles.has(villagerRole.id)){
                                    channelMember[1].setMute(true)
                                }
                            }
                            lynchedVillager.setMute(false);
                            setTimeout(unMuteAll,30000,guild);
                        }
                        else{
                            guild.channels.find(channel => channel.name === "day").send(user + " has seconded "+lynchedVillager.toString()+"!");
                            guild.channels.find(channel => channel.name === "day").send("If you would like to third type !third "+lynchedVillager.toString()+".");
                            nomSec.push(lynchedVillager.toString());

                        }

                        
					}
                    else if (lynchedVillager.roles.has(ghostRole.id)) {
						msg.delete(1000);
						msg.reply("That user is dead!");

					}
					else {
						msg.reply("We could not find that user.");
					}
                }
                */
            break;
            case 'skip':
                if (isUserHost && isDay) {
                    unMuteAll(guild);
                    clearTimeout(unMutem);

                }
            break;
			case 'lynch':
                var lynchedVillager = await guild.members.find( user => user.id ===msg.mentions.users.first().id);
                if (isUserHost && isDay) {
                    if (lynchedVillager.roles.has(discordRoles.Town.id)) {
                        guild.channels.find(channel => channel.name === "day").send(user + " has been put up on the stand! "+lynchedVillager.toString()+" has 30sec to make their case!");
                        for (let channelMember of guild.channels.find(channel => channel.name === "day-voice").members) {
                            if(channelMember[1].roles.has(discordRoles.Town.id)){
                                channelMember[1].setMute(true)
                            }
                        }
                        lynchedVillager.setMute(false);
                        //let unMutem = setTimeout(unMuteAll,30000,guild);
                        unMuteAll(unMutem);
                        msg.delete(1000);
                        
					}
                    else if (lynchedVillager.roles.has(discordRoles.Dead.id)) {
						msg.delete(1000);
						msg.reply("That user is dead!");

					}
					else {
						msg.reply("We could not find that user.");
					}
                }
                
                /*
                var lynchedVillager = await guild.members.find( user => user.id ===msg.mentions.users.first().id);
                if (user.roles.has(msg.guild.roles.find(role => role.name === "Town").id) && isDay && lynchedVillager != user && !voting && !lynching){
					var villagerRole = guild.roles.find(role => role.name === "Town");
				    var ghostRole = guild.roles.find(role => role.name === "Dead");
                    if (lynchedVillager.roles.has(villagerRole.id)) {
                        nominated.push([user,lynchedVillager]);
						guild.channels.find(channel => channel.name === "day").send(user + " has nominated "+lynchedVillager.toString()+" to the stands!");
                        guild.channels.find(channel => channel.name === "day").send("If you would like to second type !second "+lynchedVillager.toString()+".");
                        //nominated.push(lynchedVillager.toString());
				
						//lynchedVillager.removeRole(villagerRole).catch(console.error);

						//lynchedVillager.addRole(ghostRole).catch(console.error);
                        
					}
                    else if (lynchedVillager.roles.has(ghostRole.id)) {
						msg.delete(1000);
						msg.reply("That user is dead!");

					}
					else {
						msg.reply("We could not find that user.");
					}
                }
                */
            break;
            case 'inno':
            case 'innocent':
                if (user.roles.has(discordRoles.Town.id) && voting){
                    innos ++;
                    numVoted ++;  
                    if(numVoted == numPlayer){
                        guild.channels.find(channel => channel.name === "host").send("Innocent: "+innos+"\nGuilty: "+guilties+"\nAbstain: "+abstains);
                        voting = false;
                        lynching = false;
                    }
                }    
            break;
			case 'guilt':
            case 'guilty':
                if (user.roles.has(discordRoles.Town.id) && voting){
                    guilties ++;
                    numVoted ++; 
                    if(numVoted == numPlayer){
                        guild.channels.find(channel => channel.name === "host").send("Innocent: "+innos+"\nGuilty: "+guilties+"\nAbstain: "+abstains);
                        voting = false;
                        lynching = false;
                    }
                }

            break;
            case 'abstain':
				var villagerRole = guild.roles.find(role => role.name === "Town");
                if (user.roles.has(msg.guild.roles.find(role => role.name === "Town").id) && voting){
                    abstains ++;
                    numVoted ++;  
                    if(numVoted == numPlayer){
                        guild.channels.find(channel => channel.name === "host").send("Innocent: "+innos+"\nGuilty: "+guilties+"\nAbstain: "+abstains);
                        voting = false;
                        lynching = false;
                    }
                }

                
            break;
			// !kill~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			case 'kill':
				//Command must be formatted as !kill @Adam
				if (isUserHost) { 
                    numAlive = numAlive-1;
					var killedVillager = await guild.members.find( user => user.id ===msg.mentions.users.first().id);
					
					if (killedVillager.roles.has(discordRoles.Town.id)) {
						msg.delete(1000);
						channel.send(killedVillager.toString() + " has been killed");
						
						killedVillager.removeRole(discordRoles.Town).catch(console.error);
						killedVillager.addRole(discordRoles.Dead).catch(console.error);
                        killedVillager.setMute(true)
					}
                    else if (killedVillager.roles.has(discordRoles.Dead.id)) {
						msg.delete(1000);
						msg.reply("That user is already dead!");
					}
					else {
						msg.reply("That user isn't playing!");
					}
				}
				msg.delete(1000);
			break;
            // !confirm~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			case 'confirm':
				if (pleaseConfirm && isUserHost) {
                    numRoles = 0;
				    const everyone = guild.fetchMembers().then(r => {
		              r.members.array().forEach(user => assignRoles(user,guild));
                    });	
				}
                msg.delete(1000);
			break;
            // !refresh~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			case 'refresh':
                rolesIG=[];
				if (pleaseConfirm && isUserHost) {
					selectRoles(guild,roleData);
				}
                msg.delete(1000);
			break;
			// !test~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			case 'test':
				if (isUserHost) {
					if (args.length == 0 ) {
						numPlayer = 6;
					}
					else if (isUserHost) {
						numPlayer = parseInt(args[0]);
					}
					console.log("numPlayer set to: " + numPlayer);
				}
				msg.delete(1000);
			break;
			// !clear~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			case 'clear':
				if (isUserHost) {
					endGame(guild);
				}
                msg.delete(1000);
			break;
			// !help~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
			case 'help':
				var str = "The list of commands are: "
				if (isUserHost) {
					 str = "!start - to begin the game \n !kill @name - to kill a player \n !day - allows people to speak in the day channel \n !night - mutes all players and opens the night chats"
				}
				else {
					 str = "!start - to open a game and become a host \n !play (join,letmein,p,j) - to join an open game \n !role rolename - gives a description of the role"
				}
				msg.reply(str);
                msg.delete(1000);
			break;
			default:
				msg.reply(cmd + ' is not a valid command.');
                msg.delete(1000);
			break;
		 }
    }
});

//Begins the process of starting a game by inviting players to join
function invitePlayers(guild, host) {
	console.log("Inviting Players");
	isActiveGame = true;
	fillDiscordRoles(guild);
	
	host.addRole(discordRoles.Host).catch(console.error);			
	
    guild.createChannel('join-game','text').then(channel => {
        channel.send("@here, " + host.toString() + " wants to start a game, please message !play if you want to join")}).catch(console.error);
		
    guild.createChannel('host','text').then(channel => {
        channel.send("This channel is for hosts to mesage the bot privatly");
        channel.overwritePermissions(discordRoles.Everyone, { VIEW_CHANNEL: false });
        channel.overwritePermissions(discordRoles.Host, { VIEW_CHANNEL: true });
    });
}

//Starts the game
//Creates all game channels

function startGame(guild,data) {
	console.log("Starting Game");

	numAlive = numPlayer;
	
	isGameStarted = true;
	isDay = true;
    selectRoles(guild,data);
    guild.fetchMembers().then(r => {
		r.members.array().forEach(user => createUserChannels(user,guild))});
		
    guild.createChannel('day','text').then(channel => {
        channel.send("Welcome " + discordRoles.Town.toString() + " to your first day!");
        channel.overwritePermissions(discordRoles.Everyone, { VIEW_CHANNEL: false });
    	channel.overwritePermissions( 
		  discordRoles.Town, 
		  { VIEW_CHANNEL: true });
        channel.overwritePermissions( 
		discordRoles.Dead, 
		{	VIEW_CHANNEL: true,
			SEND_MESSAGES: false,
            ADD_REACTIONS: true});
        outputGroups(channel);
    });
    guild.createChannel('dead','text').then(channel => {
        channel.overwritePermissions(discordRoles.Everyone, { VIEW_CHANNEL: false });
        channel.overwritePermissions( 
		discordRoles.Dead, 
		{	VIEW_CHANNEL: true,
			SEND_MESSAGES: true,
            ADD_REACTIONS: true});
    });
    
    guild.createChannel('night-werewolf','text').then(channel => {
        channel.overwritePermissions(discordRoles.Everyone, { VIEW_CHANNEL: false });
        channel.overwritePermissions(discordRoles.Host, { VIEW_CHANNEL: true });
        channel.overwritePermissions(discordRoles.Dead, { SEND_MESSAGES: false, ADD_REACTIONS: false });
    });
    
    guild.createChannel('day-voice','voice').then(channel => {
        channel.overwritePermissions(discordRoles.Everyone, { VIEW_CHANNEL: false });
        channel.overwritePermissions( 
		  discordRoles.Town, 
		  { VIEW_CHANNEL: true });

	   channel.overwritePermissions( 
		  discordRoles.Dead, 
		  {	VIEW_CHANNEL: true,
			SPEAK: false});
        
        //Moves all people from day-vice to General
		let generalVoice = guild.channels.find(channel => channel.name === "General");
		let dayVoice = guild.channels.find(channel => channel.name === "day-voice");
		moveVoiceChannels(generalVoice, dayVoice);
    });
	
    guild.channels.find(channel => channel.name === "join-game").delete();
}

//Ends the game, cleans up roles, cleares used channels
async function endGame(guild) {
	console.log("Clearing game");
	isActiveGame = false;
	isGameStarted = false;

	//Moves all people from day-vice to General
	let generalVoice = guild.channels.find(channel => channel.name === "General");
    let dayVoice = guild.channels.find(channel => channel.name === "day-voice");
	await moveVoiceChannels(dayVoice, generalVoice);
	
	//Deletes all game channels
	dayVoice.delete();
	guild.channels.find(channel => channel.name === "host").delete();
    guild.channels.find(channel => channel.name === "dead").delete();
    guild.channels.find(channel => channel.name === "night-werewolf").delete();
    guild.channels.find(channel => channel.name === "day").delete();
	
	//removes the game roles from every member
    await guild.fetchMembers().then(r => {
		r.members.array().forEach(user => removeUserChannels(user,guild))
	});

	numPlayer = 0;
	rolesIG = new Array();
	discordRoles = null;
}


//Creates a privte channel for each player and the host
function createUserChannels(user,guild){
    if (user.roles.has(discordRoles.Town.id)){
        guild.createChannel(user.displayName,'text').then(channel => {
            channel.overwritePermissions(discordRoles.Everyone, { VIEW_CHANNEL: false });
            channel.overwritePermissions(user, { VIEW_CHANNEL: true });
            channel.overwritePermissions(discordRoles.Host, { VIEW_CHANNEL: true });
        });
    }
}

//Deletes individual channels, and removes game roles
function removeUserChannels(user,guild){
    if (user.roles.has(discordRoles.Town.id) || user.roles.has(discordRoles.Dead.id)){
        guild.channels.find(channel => channel.name === user.displayName.toLowerCase()).delete();
    }
    if (user.roles.has(discordRoles.Town.id)){
        user.removeRole(discordRoles.Town.id).catch(console.error);
    }
    if (user.roles.has(discordRoles.Host.id)){
        user.removeRole(discordRoles.Host.id).catch(console.error);
    }
    if (user.roles.has(discordRoles.Dead.id)){
        user.removeRole(discordRoles.Dead.id).catch(console.error);
    }

}

//Filles the roleArray with the game roles found in the guild
function fillDiscordRoles(guild) {
	discordRoles = new Object();
	let role = guild.roles.find(role => role.name === "Host");
	discordRoles.Host = role;
	role = guild.roles.find(role => role.name === "Town");
	discordRoles.Town = role;
	role = guild.roles.find(role => role.name === "Dead");
	discordRoles.Dead = role;
	role = guild.roles.find(role => role.name === "@everyone");
	discordRoles.Everyone = role;
}

//Selects the roles based on the number of players.
function selectRoles(guild){
    if (!rolesConfirmed){
		switch(numPlayer){
            case 6:
				randomRole(roleData.Village.Seer);
				randomRole(roleData.Village.Negative);
				randomRole(roleData.Village.Support);
				randomRole(roleData.Village.Protective);
				randomRole(roleData.Werewolf.Werewolf);
				randomRole(roleData.Werewolf.Werewolf);
            break;   

            case 7:
                randomRole(roleData.Village.Seer);
                randomRole(roleData.Village.Negative);
                randomRole(roleData.Village.Support);
                randomRole(roleData.Village.Support);
                randomRole(roleData.Village.Protective);
                randomRole(roleData.Werewolf.Werewolf);
                randomRole(roleData.Werewolf.Werewolf);
            break;

            case 8:
                randomRole(roleData.Village.Seer);
                randomRole(roleData.Village.Negative);
                randomRole(roleData.Village.Support);
                randomRole(roleData.Village.Support);
                randomRole(roleData.Village.Protective);
                randomRole(roleData.Werewolf.Werewolf);
                randomRole(roleData.Werewolf.Werewolf);
                randomRole(roleData.Neutral.Evil);
            break;

            case 9:
                randomRole(roleData.Village.Seer);
                randomRole(roleData.Village.Negative);
                randomRole(roleData.Village.Support);
                randomRole(roleData.Village.Support);
                randomRole(roleData.Village.Protective);
                randomRole(roleData.Village.Protective);
                randomRole(roleData.Werewolf.Werewolf);
                randomRole(roleData.Werewolf.Killing);
                randomRole(roleData.Neutral.Evil);
            break;

            case 10:
                randomRole(roleData.Village.Seer);
                randomRole(roleData.Village.Investigative);
                randomRole(roleData.Village.Support);
                randomRole(roleData.Village.Support);
                randomRole(roleData.Village.Protective);
                randomRole(roleData.Village.Protective);
                randomRole(roleData.Werewolf.Werewolf);
                randomRole(roleData.Werewolf.Support);
                randomRole(roleData.Werewolf.Killing);
                randomRole(roleData.Neutral.Evil);
            break;

            case 11:
                randomRole(roleData.Village.Seer);
                randomRole(roleData.Village.Investigative);
                randomRole(roleData.Village.Negative);
                randomRole(roleData.Village.Support);
                randomRole(roleData.Village.Support);
                randomRole(roleData.Village.Protective);
                randomRole(roleData.Village.Protective);
                randomRole(roleData.Werewolf.Werewolf);
                randomRole(roleData.Werewolf.Support);
                randomRole(roleData.Werewolf.Killing);
                randomRole(roleData.Neutral);
            break;

            case 12:
                randomRole(roleData.Village.Seer);
                randomRole(roleData.Village.Investigative);
                randomRole(roleData.Village.Negative);
                randomRole(roleData.Village.Support);
                randomRole(roleData.Village.Support);
                randomRole(roleData.Village.Protective);
                randomRole(roleData.Village.Protective);
                randomRole(roleData.Village.Killing);
                randomRole(roleData.Werewolf.Werewolf);
                randomRole(roleData.Werewolf.Support);
                randomRole(roleData.Werewolf.Killing);
                randomRole(roleData.Neutral.Killing);
            break;

            case 13:
                randomRole(roleData.Village.Seer);
                randomRole(roleData.Village.Investigative);
                randomRole(roleData.Village.Negative);
                randomRole(roleData.Village.Negative);
                randomRole(roleData.Village.Support);
                randomRole(roleData.Village.Support);
                randomRole(roleData.Village.Protective);
                randomRole(roleData.Village.Protective);
                randomRole(roleData.Village.Killing);
                randomRole(roleData.Werewolf.Werewolf);
                randomRole(roleData.Werewolf.Support);
                randomRole(roleData.Werewolf.Killing);
                randomRole(roleData.Neutral.Killing);
            break;

            case 14:
                randomRole(roleData.Village.Seer);
                randomRole(roleData.Village.Investigative);
                randomRole(roleData.Village.Negative);
                randomRole(roleData.Village.Support);
                randomRole(roleData.Village.Support);
                randomRole(roleData.Village.Protective);
                randomRole(roleData.Village.Protective);
                randomRole(roleData.Village.Killing);
                randomRole(roleData.Village);
                randomRole(roleData.Werewolf.Werewolf);
                randomRole(roleData.Werewolf.Support);
                randomRole(roleData.Werewolf.Killing);
                randomRole(roleData.Neutral);
                randomRole(roleData.Neutral.Killing);
            break;

            case 15:
                randomRole(roleData.Village.Seer);
                randomRole(roleData.Village.Investigative);
                randomRole(roleData.Village.Support);
                randomRole(roleData.Village.Support);
                randomRole(roleData.Village.Protective);
                randomRole(roleData.Village.Killing);
                randomRole(roleData.Village);
                randomRole(roleData.Village);
                randomRole(roleData.Village);
                randomRole(roleData.Werewolf.Werewolf);
                randomRole(roleData.Werewolf.Support);
                randomRole(roleData.Werewolf.Support);
                randomRole(roleData.Werewolf.Killing);
                randomRole(roleData.Neutral.Evil);
                randomRole(roleData.Neutral.Killing);

            break;

            case 16:
                randomRole(roleData.Village.Seer);
                randomRole(roleData.Village.Negative);
                randomRole(roleData.Village.Investigative);
                randomRole(roleData.Village.Support);
                randomRole(roleData.Village.Support);
                randomRole(roleData.Village.Protective);
                randomRole(roleData.Village.Killing);
                randomRole(roleData.Village);
                randomRole(roleData.Village);
                randomRole(roleData.Village);
                randomRole(roleData.Werewolf.Werewolf);
                randomRole(roleData.Werewolf.Support);
                randomRole(roleData.Werewolf.Support);
                randomRole(roleData.Werewolf.Killing);
                randomRole(roleData.Neutral.Evil);
                randomRole(roleData.Neutral.Killing);

            break;

            case 17:
                randomRole(roleData.Village.Seer);
                randomRole(roleData.Village.Negative);
                randomRole(roleData.Village.Negative);
                randomRole(roleData.Village.Investigative);
                randomRole(roleData.Village.Support);
                randomRole(roleData.Village.Support);
                randomRole(roleData.Village.Protective);
                randomRole(roleData.Village.Killing);
                randomRole(roleData.Village);
                randomRole(roleData.Village);
                randomRole(roleData.Village);
                randomRole(roleData.Werewolf.Werewolf);
                randomRole(roleData.Werewolf.Support);
                randomRole(roleData.Werewolf.Support);
                randomRole(roleData.Werewolf.Killing);
                randomRole(roleData.Neutral.Evil);
                randomRole(roleData.Neutral.Killing);

            break;

            case 18:

            break;

            case 19:

            break;

		}
		pleaseConfirm = true;
		var str = "The role list is as follows:\n";
		for (var i=0; i<rolesIG.length; i++) {
			str += rolesIG[i].roleName + "\n";
		}
		str += "If that is okay type !confirm if not type !refresh.";
		let chanHost = guild.channels.find(channel => channel.name === "host");
		chanHost.send(str);
		shuffle(rolesIG);
	}
}

function outputGroups(channel){
	channel.send("This game includes:");
	switch(numPlayer){
		case 6:
			channel.send("Seer\nVillage Negative\nVillage Support\nVillage Protective\nWerewolf\nWerewolf");

		break;   

		case 7:
			channel.send("Seer\nVillage Negative\nVillage Support\nVillage Support\nVillage Protective\nWerewolf\nWerewolf");

		break;

		case 8:
			channel.send("Seer\nVillage Negative\nVillage Support\nVillage Support\nVillage Protective\nWerewolf\nWerewolf\nNeutral Evil");

		break;

		case 9:
			channel.send("Seer\nVillage Negative\nVillage Support\nVillage Support\nVillage Protective\nVillage Protective\nWerewolf\nWerewolf Killing\nNeutral Evil");

		break;

		case 10:
			channel.send("Seer\nVillage Investigative\nVillage Support\nVillage Support\nVillage Protective\nVillage Protective\nWerewolf\nWerewolf Support\nWerewolf Killing\nNeutral Evil");
				
		break;

		case 11:
			channel.send("Seer\nVillage Negative\nVillage Investigative\nVillage Support\nVillage Support\nVillage Protective\nVillage Protective\nWerewolf\nWerewolf Support\nWerewolf Killing\nNeutral Random");

		break;

		case 12:
			channel.send("Seer\nVillage Negative\nVillage Investigative\nVillage Support\nVillage Support\nVillage Protective\nVillage Protective\nVillage Killing\nWerewolf\nWerewolf Support\nWerewolf Killing\nNeutral Killing");

		break;

		case 13:
			channel.send("Seer\nVillage Negative\nVillage Negative\nVillage Investigative\nVillage Support\nVillage Support\nVillage Protective\nVillage Protective\nVillage Killing\nWerewolf\nWerewolf Support\nWerewolf Killing\nNeutral Killing");

		break;

		case 14:
			channel.send("Seer\nVillage Negative\nVillage Investigative\nVillage Support\nVillage Support\nVillage Protective\nVillage Protective\nVillage Killing\nVillage Random\nWerewolf\nWerewolf Support\nWerewolf Killing\nTrue Neutral\nNeutral Killing");

		break;

		case 15:
			channel.send("Seer\nVillage Investigative\nVillage Support\nVillage Support\nVillage Protective\nVillage Killing\nVillage Random\nVillage Random\nVillage Random\nWerewolf\nWerewolf Support\nWerewolf Support\nWerewolf Killing\nNeutral Evil\nNeutral Killing");

		break;

		case 16:
			channel.send("Seer\nVillage Investigative\nVillage Negative\nVillage Support\nVillage Support\nVillage Protective\nVillage Killing\nVillage Random\nVillage Random\nVillage Random\nWerewolf\nWerewolf Support\nWerewolf Support\nWerewolf Killing\nNeutral Evil\nNeutral Killing");

		break;

		case 17:
			channel.send("Seer\nVillage Investigative\nVillage Negative\nVillage Negative\nVillage Support\nVillage Support\nVillage Protective\nVillage Killing\nVillage Random\nVillage Random\nVillage Random\nWerewolf\nWerewolf Support\nWerewolf Support\nWerewolf Killing\nNeutral Evil\nNeutral Killing");

		break;

		case 18:

		break;

		case 19:

		break;
	}
}

//Selects a random role from the passed data
function randomRole(array) {
	if (Array.isArray(array)) {
		let rando = Math.floor(Math.random()*array.length);
		rolesIG.push(array[rando]);
	}
	else {
		let newArray = new Array();
		Object.values(array).forEach(arr => {
			newArray = newArray.concat(arr);
		});
		randomRole(newArray);
	}
}

//Changes the order of the Array
function shuffle(array) {
	var currentIndex = array.length, temporaryValue, randomIndex;

	// While there remain elements to shuffle...
	while (0 !== currentIndex) {

		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;
}

//This gives each user their role from the roleIG array
function assignRoles(user,guild){
    if (user.roles.has(discordRoles.Town.id)){
		let userChannel = guild.channels.find(channel => channel.name === user.displayName.toLowerCase());
		userChannel.send("Your role is:");
		printRole(rolesIG[numRoles], userChannel);
		
		//This gives access to the werewolf channel if a role should have access to it
        if(rolesIG[numRoles].category.includes('Werewolf') || rolesIG[numRoles].roleName == "Lone Wolf" || rolesIG[numRoles].roleName == "White Wolf"){
            if(rolesIG[numRoles].roleName != "Sorcerer" && rolesIG[numRoles].roleName != "Gremlin" && rolesIG[numRoles].roleName != "Harpy" && rolesIG[numRoles].roleName != "Nightmare" && rolesIG[numRoles].roleName != "Mystic Hunter" && rolesIG[numRoles].roleName != "Sloppy Executioner" && rolesIG[numRoles].roleName != "Dream Wolf") {
                guild.channels.find(channel => channel.name === "night-werewolf").overwritePermissions(user, { VIEW_CHANNEL: true });
            }
        }
        
        //This checks if a undercover werewolf exists and if it does it creates a channel for it
        if (rolesIG[numRoles].roleName == "Undercover Wolf" && createdUWolfChannel == false){
            guild.createChannel('undercover-wolf','text').then(channel => {
                channel.send("In this channel you will see all messages sent by the wolves! You will not know from whom they come from.");
                channel.overwritePermissions(everyoneRole, { VIEW_CHANNEL: false });
                channel.overwritePermissions(user, { VIEW_CHANNEL: true, SEND_MESSAGES: false});});
            
            createdUWolfChannel = true;
        }
        else if(rolesIG[numRoles].roleName == "Undercover Wolf"){
            guild.channels.find(channel => channel.name === 'undercover-wolf').overwritePermissions(user, { VIEW_CHANNEL: true, SEND_MESSAGES: false});
        }

        //This checks if a medium and if it does it creates a channel for it
        if (rolesIG[numRoles].roleName == "Medium" && createdMediumChannel == false){
                guild.createChannel('mediums-visions','text').then(channel => {
                    channel.send("This is the channel for the mediums visions. The medium can type freely in the channel during the night and recieve reactions from the dead!");
                    channel.overwritePermissions(everyoneRole, { VIEW_CHANNEL: false });
                    channel.overwritePermissions(user, { VIEW_CHANNEL: true });
                    channel.overwritePermissions(ghostRole, 
                    {	VIEW_CHANNEL: true,
                        SEND_MESSAGES: false,
                        ADD_REACTIONS: true});});
            
            createdMediumChannel = true;
        }
        else if(rolesIG[numRoles].roleName == "Medium"){
            guild.channels.find(channel => channel.name === 'mediums-visions').overwritePermissions(user, { VIEW_CHANNEL: true });
        }
        guild.createChannel('undercover-wolf','text').then(channel => {
                channel.send("In this channel you will see all messages sent by the wolves! You will not know from whom they come from.");
                channel.overwritePermissions(everyoneRole, { VIEW_CHANNEL: false });
                channel.overwritePermissions(user, { VIEW_CHANNEL: true, SEND_MESSAGES: false});});
            
        createdUWolfChannel = true;

        numRoles ++;
    }
}

//This finds a role given a specific string
function roleCheck(roleString) {
	for (let i = 0; i < allRoles.length; i++) {
		if (allRoles[i].roleName.toLowerCase() == roleString.toLowerCase()) {
			return allRoles[i];
		}
	}
	return null;
}

//This prints a role in a formatted block
async function printRole(role, channel) {
	const embed = await new Discord.RichEmbed()
		.setTitle(role.roleName)
		.setColor(0x00AE86)
		.addField("Description:", role.description)
		.addField("Category:", role.category)
		.addField("Seen as:", role.seenAs)
		.addField("Objective: ", role.winCon);
	await channel.send({embed});
}

function unMuteAll(guild){
    guild.channels.find(channel => channel.name === "day").send("The town has 30sec to discuss what they heard!");
    for (let channelMember of guild.channels.find(channel => channel.name === "day-voice").members) {
        if(channelMember[1].roles.has(discordRoles.Town.id)){
            channelMember[1].setMute(false)
        }
    }
    setTimeout(muteAllVote,30000,guild);    
}

function muteAllVote(guild){
    guild.channels.find(channel => channel.name === "day").send("Everyone must now vote! Either !guilty | !innocent | !abstain");
    for (let channelMember of guild.channels.find(channel => channel.name === "day-voice").members) {
        if(channelMember[1].roles.has(discordRoles.Town.id)){
            channelMember[1].setMute(true)
        }
    }
    guild.channels.find(channel => channel.name === "host").overwritePermissions( villagerRole, { SEND_MESSAGES: false});
    skipped = true;
}

//Moves everyone from the old channel to the new channel
function moveVoiceChannels(oldChannel, newChannel) {
	console.log("Moving all players from " + oldChannel.name + " to " + newChannel.name);
	for (let channelMember of oldChannel.members) {
		channelMember[1].setVoiceChannel(newChannel);
		channelMember[1].setMute(false);
    }   
}

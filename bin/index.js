#!/usr/bin/env node
"use strict";

const path = require( "path" );
require( "dotenv" ).config( { path: path.join( __dirname, "..", ".env" ) } );
const client = require( "../src/client" );
const { Command } = require( "commander" );
const pkg = require( "../package.json" );
const program = new Command();

program
	.version( pkg.version )
	.description( "A tool for syncing Zendesk tickets to Asana" );

program
	.command( "sync" )
	.description( "Synchronize the latest Zendesk tickets to Asana" )
	.option( "-t, --ticket <ticket>", "manually sync one ticket" )
	.option( "-q, --query-only", "list ticket returned by search" )
	.action( async ( { ticket, queryOnly } ) => {
		if ( queryOnly ) {
			const { ZENDESK_HOST: host } = process.env;
			const data = await client.getTickets();
			const tickets = data.map( t => {
				return {
					id: t.id,
					update: t.updated_at,
					subject: t.subject,
					status: t.status,
					group_id: t.group_id,
					url: `https://${ host }.zendesk.com/agent/tickets/${ t.id }`
				};
			} );
			console.log( tickets );
			return;
		}
		if ( ticket === undefined ) {
			await client.syncTickets();
		} else {
			await client.syncTicket( ticket );
		}
	} );

program
	.command( "task <ticket>" )
	.description( "Asana task info and actions" )
	.option( "-c, --complete", "Move to complete" )
	.action( async ( ticket, options ) => {
		const t = await client.getTaskByCustomId( `ZD: ${ ticket }` );

		if ( options.complete ) {
			console.log( `Moving [${ t.gid } - ${ t.name }] to complete` );
			const res = await client.moveTaskToComplete( t.gid );
			console.log( res );
			return;
		} else {
			console.log( t );
		}
	} );

program
	.command( "groups" )
	.description( "List groups in Zendesk" )
	.action( async () => {
		const data = await client.getGroups();
		const res = data.map( g => {
			return {
				id: g.id,
				name: g.name,
				description: g.description
			};
		} );
		console.log( res );

		return;
	} );

program.parse( process.argv );

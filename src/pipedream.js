/* global defineComponent */
import axios from "axios";

export default defineComponent( {
	// eslint-disable-next-line no-unused-vars
	async run( { steps, $ } ) {
		function formatCustomId( id ) {
			return `ZD: ${ id }`;
		}

		function formatReviewId( name, version ) {
			return `Review: ${ name } - ${ version }`;
		}

		function parseReviewTicket( description ) {
			const reviewExp = /App "(?<appName>[^"]*)" version "(?<version>[^"]*).* id: (?<account>[0-9]*)/gsm;
			const { groups: { appName, version, account } } = reviewExp.exec( description );
			return {
				appName,
				version,
				account
			};
		}

		async function closeAppReviewTicket( id ) {
			try {
				const {
					ZENDESK_API_TOKEN: token,
					ZENDESK_EMAIL: username,
					ZENDESK_HOST: host } = process.env;

				const buff = Buffer.from( `${ username }/token:${ token }` );
				const encoded = buff.toString( "base64" );

				const config = {
					method: "put",
					url: `https://${ host }.zendesk.com/api/v2/tickets/${ id }`,
					headers: {
						Accept: "application/json",
						"Content-Type": "application/json",
						Authorization: `Basic ${ encoded }`
					},
					data: 		{
						ticket: {
							status: "solved"
						}
					}
				};
				const res = await axios( config );
				return res.data;
			} catch ( err ) {
				console.log( err );
				return [];
			}
		}

		async function moveTaskToComplete( taskId ) {
			const {
				ASANA_SECTION_COMPLETE: completeSectionId
			} = process.env;
			return moveTaskToSection( completeSectionId, taskId );
		}

		async function markTaskComplete( taskId ) {
			try {
				const {
					ASANA_PAT: asanaToken
				} = process.env;

				const config = {
					method: "put",
					url: `https://app.asana.com/api/1.0/tasks/${ taskId }`,
					headers: {
						Authorization: `Bearer ${ asanaToken }`
					},
					data: {
						data: {
							completed: true
						}
					}
				};

				const res = await axios( config );
				return res.data;

			} catch ( err ) {
				console.log( err );
				return "Error: " + err.message;
			}
		}

		async function moveTaskToSection( sectionId, taskId ) {
			try {
				const {
					ASANA_PAT: asanaToken,
					ASANA_SECTION_COMPLETE: completeSectionId
				} = process.env;

				const config = {
					method: "post",
					url: `https://app.asana.com/api/1.0/sections/${ sectionId }/addTask`,
					headers: {
						Authorization: `Bearer ${ asanaToken }`
					},
					data: {
						data: {
							task: taskId
						}
					}
				};

				const res = await axios( config );

				if ( sectionId === completeSectionId ) {
					await markTaskComplete( taskId );
				}

				return res.data;

			} catch ( err ) {
				console.log( err );
				return "Error: " + err.message;
			}
		}

		async function getTickets() {
			try {
				const {
					ZENDESK_API_TOKEN: token,
					ZENDESK_EMAIL: username,
					ZENDESK_HOST: host,
					ZENDESK_DAYS_TO_CHECK: days,
					ZENDESK_STATUS_THRESHOLD: searchStatus,
					ZENDESK_GROUP_ID: groupId } = process.env;

				const buff = Buffer.from( `${ username }/token:${ token }` );
				const encoded = buff.toString( "base64" );
				const dt = new Date();
				dt.setDate( dt.getDate() - days );
				const dtFilter = dt.toISOString().substring( 0, 10 );
				const search =`status<${ searchStatus } group:${ groupId } updated>${ dtFilter }`;
				const url = `https://${ host }.zendesk.com/api/v2/search.json?query=${ search }`;
				console.log( url );
				const config = {
					method: "get",
					url,
					headers: {
						Accept: "application/json",
						"Content-Type": "application/json",
						Authorization: `Basic ${ encoded }`
					}
				};
				const res = await axios( config );
				return res.data.results;
			} catch ( err ) {
				console.log( err );
				return [];
			}
		}

		async function getTaskByCustomId( id ) {
			try {
				const {
					ASANA_PAT: asanaToken,
					ASANA_WORKSPACE: workspaceId,
					ASANA_PROJECT: projectId,
					ASANA_CUSTOM_FIELD_EXTERNAL_ID: fieldId
				} = process.env;

				const config = {
					method: "get",
					url: `https://app.asana.com/api/1.0/workspaces/${ workspaceId }/tasks/search?project.all=${ projectId }&custom_fields.${ fieldId }.value=${ id }`,
					headers: {
						Authorization: `Bearer ${ asanaToken }`
					}
				};
				const tasks = await axios( config );
				// console.log( tasks.data.data );
				if ( !tasks.data.data.length ) {
					return null;
				}
				const taskId = tasks.data.data[0].gid;
				config.url = `https://app.asana.com/api/1.0/tasks/${ taskId }`;
				const res = await axios( config );
				const task = res.data.data;
				const { gid, name } = task;

				return {
					gid,
					name,
					section: task.memberships[0].section
				};
			} catch( err ) {
				console.log( err );
				return null;
			}
		}

		async function createTask( { title, id, url, description = "" } ) {
			try {
				const {
					ASANA_PAT: asanaToken,
					ASANA_WORKSPACE: workspaceId,
					ASANA_PROJECT: projectId,
					ASANA_CUSTOM_FIELD_EXTERNAL_ID: externalId,
					ASANA_CUSTOM_FIELD_URL_ID: urlId,
					ASANA_CUSTOM_FIELD_TASK_TYPE_ID: taskTypeId,
					ASANA_CUSTOM_FIELD_TASK_TYPE_SUPPORT_VALUE: taskTypeValue
				} = process.env;

				const config = {
					method: "post",
					url: "https://app.asana.com/api/1.0/tasks",
					headers: {
						Authorization: `Bearer ${ asanaToken }`
					},
					data: {
						data: {
							name: title,
							notes: description,
							workspace: workspaceId,
							projects: [ projectId ],
							custom_fields: { }
						}
					}
				};

				config.data.data.custom_fields[`${ externalId }`] = id;
				config.data.data.custom_fields[`${ urlId }`] = url;
				config.data.data.custom_fields[`${ taskTypeId }`] = taskTypeValue;

				const res = await axios( config );
				return res.data;

			} catch ( err ) {
				console.log( err );
				return "Error: " + err.message;
			}
		}

		async function saveTicketToAsana( host, id, subject, description, status ) {
			const {
				ASANA_SECTION_UP_NEXT: upNext,
				ASANA_SECTION_AWAITING_FEEDBACK: awaitingFeedback,
				ASANA_SECTION_COMPLETE: complete
			} = process.env;
			const url = `https://${ host }.zendesk.com/agent/tickets/${ id }`;
			if ( subject === "[PRODUCTION] App Version Created" || subject.startsWith( "[STAGING]" ) ) {
				console.log( "ticket to close:", id, subject, url );
				await closeAppReviewTicket( id );
			} else if ( subject === "[PRODUCTION] App Version Withdrawn" ) {
				const review = parseReviewTicket( description );
				const task = await getTaskByCustomId( formatReviewId( review.appName, review.version ) );
				if ( task ) {
					const reviewSubject = review.appName + " " + review.version;
					console.log( "discarding:", id, reviewSubject );
					await moveTaskToComplete( task.gid );
				}
				console.log( "ticket to close:", id, subject, url );
				await closeAppReviewTicket( id );
			} else if ( subject === "[PRODUCTION] App Version Submitted" ) {
				const review = parseReviewTicket( description );

				const task = await getTaskByCustomId( formatReviewId( review.appName, review.version ) );
				if ( !task ) {
					const reviewSubject = review.appName + " " + review.version;
					console.log( "review card to create:", id, reviewSubject );
					const t = await createTask( {
						title: reviewSubject,
						id: formatReviewId( review.appName, review.version  ),
						url,
						description
					} );
					await moveTaskToSection( upNext, t.data.gid );
					// console.log( t );
				}
				console.log( "ticket to close:", id, subject, url );
				await closeAppReviewTicket( id );
			} else {
				const task = await getTaskByCustomId( formatCustomId( id ) );
				if ( !task ) {
					console.log( "support card to create:", id, subject );
					const t = await createTask( {
						title: subject,
						id: formatCustomId( id ),
						url,
						description: url
					} );
					await moveTaskToSection( upNext, t.data.gid );
					// console.log( t );
				} else if ( status === "new" || status === "open" ) {
					if ( task.section.gid === awaitingFeedback || task.section.gid === complete ){
						console.log( "moving task to up next:", task.gid, task.name );
						await moveTaskToSection( upNext, task.gid );
					}
				}
			}
		}

		async function syncTickets() {
			const { ZENDESK_HOST: host } = process.env;
			const tickets = await getTickets();
			for( const { id, subject, description, status } of tickets ) {
				await saveTicketToAsana( host, id, subject, description, status );
			}
		}

		await syncTickets();

		// Reference previous step data using the steps object and return data to use it in future steps
		return steps.trigger.event;
	},
} );

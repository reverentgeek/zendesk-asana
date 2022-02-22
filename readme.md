# Zendesk to Asana Integration

This is used at ActiveCampaign to synchronize specific Zendesk tickets (DevRel) to an Asana project. This code uses several custom fields to sync using the ZD ticket ID, the URL, and an enum to tag the task as a support task.

## Setup

* Clone or download project
* Install dependencies using `npm install`
* Copy `.env.sample` to `.env`
* Update `.env` with your Zendesk and Asana environment settings

## Run Integration Manually using the CLI

```sh
Usage: node . [options]

Synchronize the latest Zendesk tickets to Asana

Options:
  -V, --version          output the version number
  -t, --ticket <ticket>  manually sync one ticket
  -q, --query-only       list ticket returned by search
  -g, --groups           list groups
  -h, --help             display help for command
```

Query active tickets:

```sh
node . -q
```

Synchronize all active tickets:

```sh
node .
```

## Deployment

This code is designed to be deployed with minor modifications to a scheduled task runner such as [Pipedream](https://pipedream.com/).

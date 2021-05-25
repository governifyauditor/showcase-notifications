# Showcase notifications
This is a showcase project to exemplify the process of setting up the notifications and simulating a workflow for the system to notify. 

We will be using Slack but the process should be the same except the TPA notifications configuration.

## System setup

0. Deploy the system if you have not done it yet. The guide is available at [Governify's webpage](https://www.governify.io/quickstart/auditing-agile-2.0/).
1. Add the following class to the scopes.json. We have a [guide](https://www.governify.io/quickstart/auditing-agile-2.0#scope.json) available talking about this file.
```javascript
{
    "classId": "testing-notifications",
    "identities": [],
    "credentials": [],
    "projects": []
},
```

2. Restart the Scope Manager for it to update with the scopes.json changes.
```
docker restart bluejay-scope-manager
```

3. Obtain a Slack Weebhook. It will be used by Grafana to notify to a specific channel of your choice inside a server. [Here](https://api.slack.com/messaging/webhooks) you have a guide by Slack explaining how to get one.

4. Add a new TPA template in the assets in the folder /public/renders/tpa called `testing-notifications.json` and insert your slack webhook in `context.definitions.notifications.grafana.slack.settings.url`:
```
{
    "id": "tpa-1010101010",
    "version": "1.0.0",
    "type": "agreement",
    "context": {
        "validity": {
            "initial": "2017-10-15",
            "timeZone": "America/Los_Angeles"
        },
        "definitions": {
            "schemas": {},
            "scopes": {
                "development": {
                    "project": {
                        "name": "Project",
                        "description": "Project",
                        "type": "string",
                        "default": "1010101010"
                    }
                }
            },
            "notifications": {
                "grafana": {
                    "slack": {
                        "name": "slack",
                        "type": "slack",
                        "settings": {
                            "url": "ENTER YOUR SLACK WEBHOOK HERE"
                        }
                    }
                }
            },
            "collectors": {
                "eventcollector": {
                    "infrastructurePath": "internal.collector.events",
                    "endpoint": "/api/v2/computations",
                    "type": "POST-GET-V1",
                    "config": {
                        "scopeManager": "$_[infrastructure.internal.scopes.default]/api/v1/scopes/development"
                    }
                }
            },
            "dashboards": {
                "main": {
                    "base": "$_[infrastructure.internal.assets.default]/api/v1/public/grafana-dashboards/tpa/base.json",
                    "modifier": "$_[infrastructure.internal.assets.default]/api/v1/public/grafana-dashboards/tpa/modifier.js",
                    "overlay": "$_[infrastructure.internal.assets.default]/api/v1/public/grafana-dashboards/tpa/overlay.js"
                }
            }
        }
    },
    "terms": {
        "metrics": {
            "NUMBER_GH_NEWBRANCH": {
                "collector": {
                    "$ref": "#/context/definitions/collectors/eventcollector"
                },
                "metric": {
                    "computing": "actual",
                    "element": "number",
                    "event": {
                        "ghwrapper": {
                            "events": {
                                "type": "CreateEvent",
                                "payload": {
                                    "ref_type": "branch"
                                }
                            }
                        }
                    },
                    "scope": {
                        "$ref": "#/context/definitions/scopes/development"
                    }
                }
            }
        },
        "guarantees": [
            {
                "id": "AT_LEAST_2_NEW_BRANCHES_EVERY_HOUR",
                "notes": "#### Description\r\n```\r\nTP-1: There must be at least 2 new branches every hour.",
                "scope": {
                    "$ref": "#/context/definitions/scopes/development"
                },
                "notifications": {
                    "grafana": {
                        "slack": {}
                    }
                },
                "of": [
                    {
                        "scope": {
                            "project": "1010101010"
                        },
                        "objective": "NUMBER_GH_NEWBRANCH >= 2",
                        "with": {
                            "NUMBER_GH_NEWBRANCH": {}
                        },
                        "window": {
                            "type": "static",
                            "period": "hourly",
                            "initial": "2018-01-01"
                        }
                    }
                ]
            }
        ]
    }
}
```
5. Setup repository and add an info.yml file in the root of your repo (main or master branch). You can check this [template](https://github.com/governify/audited-project-template/blob/main/info.yml) or this [example](https://github.com/governifyauditor/goldenflow-showcase-project/blob/main/info.yml) and add it.

6. Register in the System. You can checkout [this guide](https://www.governify.io/quickstart/add-teams) about how to add a team in the system.
7. Add the script `dashboardGenerator.js` (can be found at the root of this repository) to the assets at /public/director in case it is not present. This script is the responsible to persist the dashboards in order for Grafana to notify on any change.
8. Enable the task execution at the Director. For it you need to POST this information:
```
{
    "id": "dashboard-generation",
    "script": "http://bluejay-assets-manager/api/v1/public/director/dashboardGenerator.js",
    "running": true,
    "config": {
        "agreementId": "tpa-CS169L-GH-governifyauditor_goldenflow-showcase-project"
    },
    "init": "2020-01-01T00:00:00",
    "end": "2030-01-01T00:00:00",
    "interval": 86400000
}
```
It is setted up to run every day to persist any new dashboard and update any modification.
9. Access the UI at ui[BLUEJAY_SERVICES_PREFIX][BLUEJAY_DNS_SUFFIX] (f.e. https://ui.bluejay.mydomain.org) and load the course (testing-notifications). Then access to your project.

## Workflow Simulation
The TPA template used in this example is very simple and its only purpose is to demonstrate the notifications functioning and capabilities.

It contains a single metric and guarantee, being the TP: "There must be at least 2 branch creations every hour.". If only a branch is created, the TP won't be fulfilled and thus a notification should be received in the configured channel. If 4 branches are created, there should be no notification.

As the system is not configured to automatically compute the metrics, we will have to click on the Compute Metrics in the UI and select the correct interval of time.

### Steps for receiving a notification
1. Create a branch
2. Compute Metrics for the interval

You should receive a notification.

### Steps for receiving a notification
1. Create three branches
2. Compute Metrics for the interval

You shouldn't receive a notification.


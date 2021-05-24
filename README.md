# Showcase notifications
This is a showcase project to exemplify the process of setting up the notifications and simulating a workflow for the system to notify. 

We will be using Slack but the process should be the same except the TPA notifications configuration.

## System setup

0. Deploy the system if you have not done it yet.
1. Add the following class to the scopes.json
```javascript
{
    "classId": "testing-notifications",
    "identities": [],
    "credentials": [],
    "projects": []
},
```

2. Restart the Scope Manager
```
docker restart bluejay-scope-manager
```

3. Obtain a Slack Weebhook
TODO

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

6. Register in the System. You can checkout [this guide](https://www.governify.io/quickstart/add-teams) talking about the "Join" microservice for adding your team in the system.
7. Access the UI and load the course (testing-notifications). Then access to your project.

## Workflow Simulation
TODO

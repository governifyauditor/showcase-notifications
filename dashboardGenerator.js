const axios = require('axios')
const util = require('util')

let status = {
    lastExecution: new Date(),
    lastResult: null,
    success: true
};

const grafanaKey = "ADD_GRAFANA_KEY_HERE";

let alert = {
    "alertRuleTags": {},
    "conditions": [
        {
            "evaluator": {
                "params": [
                    "###NOTIFICATION.THRESHOLD.VALUE###"
                ],
                "type": "###NOTIFICATION.THRESHOLD.OPERATOR###"
            },
            "operator": {
                "type": "and"
            },
            "query": {
                "params": [
                    "A",
                    "72h",
                    "now"
                ]
            },
            "reducer": {
                "params": [],
                "type": "last"
            },
            "type": "query"
        }
    ],
    "executionErrorState": "alerting",
    "for": "1m",
    "frequency": "1m",
    "handler": 1,
    "name": "###NOTIFICATION.NAME###",
    "message": "Information about TPA ###AGREEMENT.ID### and practice ###NOTIFICATION.NAME###",
    "noDataState": "keep_state",
    "notifications": [
        {
            "uid": "###NOTIFICATION.CHANNELUID###"
        }
    ]
}


async function processAgreement(agreement) {
    Object.keys(agreement.context.definitions.dashboards).forEach(async (dashboardId) => {
        let responseDashboard = await axios('$_[infrastructure.internal.reporter.default]/api/v4/dashboards/' + agreement.id + '/' + dashboardId);
        responseDashboard.data.id = ''
        let jsonDashboard = { dashboard: responseDashboard.data, folderId: 0, overwrite: true };
        console.log(jsonDashboard)
        console.log('Test1')

        //Get grafana channels and create if the channels doesnt exists



        console.log('test2')
        let grafanaExistingChannelsRequest = await axios.get('$_[infrastructure.internal.dashboard.default]/api/alert-notifications', {
            headers: { Authorization: 'Bearer ' + grafanaKey }
        }).catch(console.log);

        let grafanaExistingChannels = grafanaExistingChannelsRequest.data;
        console.log('test3')
        let notificationChannels = agreement.context ?.definitions ?.notifications ?.grafana;
        console.log(agreement.context ?.definitions ?.notifications)
        let grafanaChannels;
        //Post notificationChannels to Grafana
        if (notificationChannels) {
            grafanaChannels = await Promise.all(Object.keys(notificationChannels).map(async (channel) => {
                let channelData = grafanaExistingChannels.find((element) => { return element.name == agreement.id + '-' + notificationChannels[channel].name });

                if (!channelData) {
                    console.log('Posting alert', notificationChannels[channel])
                    notificationChannels[channel].name = agreement.id + '-' + notificationChannels[channel].name;
                    postChannel = await axios.post('$_[infrastructure.internal.dashboard.default]/api/alert-notifications', notificationChannels[channel], {
                        headers: { Authorization: 'Bearer ' + grafanaKey }
                    });
                    channelData = postChannel.data
                }
                return channelData;

            }));
        }

        //Modify dashboard to set notificationChannelID
        let guarantees = agreement.terms.guarantees;

        for (let guarantee of guarantees) {
            let guaranteeName = guarantee.id;
            if (guarantee.notifications ?.grafana) {
                console.log('NOTIFICATION!')
                let panel = jsonDashboard.dashboard.panels.find(panel => {
                    return panel.type === 'graph' && panel.guarantee === guaranteeName
                })
                let panelIndex = jsonDashboard.dashboard.panels.indexOf(panel);

                if (panel) {
                    console.log('FOUND')
                    let alertString = JSON.stringify(alert);
                    let aux = grafanaChannels.find(channel => { ; return channel.name == agreement.id + '-' + Object.keys(guarantee.notifications.grafana)[0] });
                    alertString = alertString.replace(/###NOTIFICATION.CHANNELUID###/g, aux.uid)
                    let objective = guarantee.of[0].objective;
                    alertString = alertString.replace(/"###NOTIFICATION.THRESHOLD.VALUE###"/g, objective.split(" ")[objective.split(" ").length - 1]);


                    const operators = {
                        ">": "lt",
                        "<": "gt",
                        "=": "eq",
                        ">=": "lt",
                        "<=": "gt"
                    }

                    alertString = alertString.replace(/###NOTIFICATION.THRESHOLD.OPERATOR###/g, operators[objective.split(" ")[objective.split(" ").length - 2]])
                    alertString = alertString.replace(/###NOTIFICATION.NAME###/g, objective);
                    alertString = alertString.replace(/###AGREEMENT.ID###/g, agreement.id);

                    
                    panel.alert = JSON.parse(alertString);
                    jsonDashboard.dashboard.panels[panelIndex] = panel;
                }
            }
        }


        try {
            //  jsonDashboard.replaceAll('###NOTIFICATION.UID###',  )
            let responseUpdate = await axios.post('$_[infrastructure.internal.dashboard.default]/api/dashboards/db', jsonDashboard, {
                headers: { Authorization: 'Bearer ' + grafanaKey }
            });

            console.log(util.inspect(responseUpdate.data))
            status.lastResult = responseUpdate.data
            status.lastExecution = new Date();

            updateDirectorStatus()
            console.log('Execution finished')
        }
        catch (err) {
            console.log(err)
        }

    })


}

module.exports.main = async function (config) {
    console.log("config:", config)
    let agreementsGET = await axios.get('$_[infrastructure.internal.registry.default]/api/v6/agreements');
    let agreements = agreementsGET.data;
    agreements.forEach(agreement => {
        if (agreement.context.definitions.notifications && agreement.id === config.agreementId) {
            processAgreement(agreement);
            console.log('Creating notifications for ', agreement.id)
        }
    })
}



function updateDirectorStatus() {
    axios.put('$_[infrastructure.internal.assets.default]/api/v1/public/director/dashboard-generator.status', status)
}

this.main();

const server = require('server');
const { get, socket, } = server.router;
const { status, render, header } = server.reply;
const EventEmitter = require('events');


const PORT = 3000

const notifications = {
    NONE: [],
    ALERT_NURSE_CALL: [{
        "notification_id": 3,
        "event_time": 1649724699587,
        "event_type": "ALERT_NURSE_CALL",
        "count": 0,
        "resolved_at": null,
        "resolved_by": null,
        "dismissed": null,
        "watch": {
            "watch_mac": "c2:bb:8f:4e:ed:68",
            "patient_id": "b6d402d3-71d7-474b-8e41-bd8843635f05",
            "watch_model": "Bangle2",
            "last_log_collection": null
        },
        "access_point": {
            "access_point_mac": "b8:27:eb:50:9d:d7",
            "description": "Home Office (b8:27:eb:50:9d:d7)",
            "near_exit": 0,
            "access_point_model": "Raspberry Pi Zero W",
            "access_point_ip": "192.168.0.224",
            "last_log_collection": 1649724710651
        }
    }],
    PATIENT_NOT_FOUND: [{
        "notification_id": 1,
        "event_time": 1648503331560,
        "event_type": "PATIENT_NOT_FOUND",
        "count": "null", "resolved_at": null,
        "resolved_by": null,
        "dismissed": null,
        "watch": {
            "watch_mac": "d2:af:e6:d3:73:f6",
            "patient_id": "a1b9378d-7fd1-473a-88c7-24b774d36b06",
            "watch_model": "Bangle2",
            "last_log_collection": null
        }
    }]
}
notifications.BOTH = notifications.ALERT_NURSE_CALL.concat(notifications.PATIENT_NOT_FOUND)

const eventDriver = new EventEmitter();

const scheduleRandomNotifications = () => {
    let n;
    const i = Math.round(2 * Math.random());
    switch (i) {
        case 0:
            n = notifications.ALERT_NURSE_CALL;
            break;
        case 1:
            n = notifications.PATIENT_NOT_FOUND;
            break;
        case 2:
            n = notifications.BOTH;
            break;
    }
    eventDriver.emit('unresolved-notifications', n);
    setTimeout(scheduleRandomNotifications, 1e3 * Math.round(1 + 3 * Math.random()))
}

const CORS = [
    ctx => header("Access-Control-Allow-Origin", "*"),
    ctx => header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept"),
    ctx => header("Access-Control-Allow-Methods", "GET, PUT, PATCH, POST, DELETE, HEAD"),
    ctx => ctx.method.toLowerCase() === 'options' ? 200 : false
];



async function run() {
    try {
        scheduleRandomNotifications();
        const internal_ip = await import('internal-ip');
        const { internalIpV4Sync } = internal_ip;
        const server_ip = internalIpV4Sync();
        server({
            port: PORT,
            security: false,
            public: 'public',
            views: 'public',
            socket: {
                path: '/unresolved-notifications-socket'
            }
        },
            CORS,
            [
                // get('/unresolved-notifications', ctx => status(200).json(determine_output())),
                get('/unresolved-notifications', ctx => render('ws-test.html')),
                socket('connect', ctx => {
                    console.log('Socket connected!');
                    ctx.socket.on('disconnect', () => {
                        console.log('Socket disconnected :(');
                    });

                    //immediately emit all unresolved notifications
                    ctx.socket.emit('unresolved-notifications', notifications.BOTH)

                    // n will always be an array of notifications, with n.length >= 1
                    eventDriver.on('unresolved-notifications', n => ctx.socket.emit('unresolved-notifications', n));

                })
            ]);

        console.log(`Server is running at http://${server_ip}:${PORT}/unresolved-notifications`)

    } catch (e) {
        console.error(e);
    }

}
run()

import Echo from "laravel-echo";
import io from "socket.io-client";
import config from "../config";
import dayjs from "dayjs";

class Notification {
    connect() {
        const socket = new Echo({
            broadcaster: "socket.io",
            host: config.app.socketServer,
            client: io,
            auth: {
                headers: {
                    ["bot-instance-id"]: config.instance.id
                }
            }
        });
        this.notification = socket.private(`instances.${config.instance.id}.notification`);
    }

    emit(chat, status) {
        const date = dayjs().format("YYYY-MM-DD HH:mm:ss");
        //console.log(chat, {...status,  instanceId: config.instance.id, date: date});
        this.notification.whisper(chat, {...status, instanceId: config.instance.id, date: date});
    }

    on(chat, callback) {
        this.notification.listenForWhisper(chat, callback);
    }
}

export default new Notification();

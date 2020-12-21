import API from "../services/api";
import Informant from "../services/informant";
import appConfig from "../config";
import util from "util";
class Index {
  constructor() {
    Informant.connect();
  }

  async tellServerAboutNotificaition( notification) {
    return API.post(`/instances/${appConfig.instance.id}/updatenotification`, { aws_instance_id: appConfig.instance.id, notification })
      .then(res => {
        if (res.status === 201) {
          // console.log(`Informing about "${key}" has been successfully performed`);
        }
        return true;
      })
      .catch(error => {
        console.log(error);
        throw error;
      });
  }

  async tellClientsAboutNotification(path, data) {
    // console.log("TELL", path);
    Informant.emit(`${path}`, data);
  }
}

export default Index;

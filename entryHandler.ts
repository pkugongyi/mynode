import UnitTools from '../../../util/UnitTools';

import SlsLog from '../../../util/slsLog';
import { writeLog } from '../../../util/slsLog';
// const AppManage = require("../../../model/AppManage");

import { Application } from 'pinus';

export default function (app: Application) {
    return new Handler(app);
}

export class Handler {
    constructor(private app: Application) {
        this.app = app;
    }

    /**
     * New client entry chat server.
     *
     * @param  {Object}   msg     request message
     * @param  {Object}   session current session object
     * @return {Void}
     */

    async enter(msg, session) {
        console.log('enter', JSON.stringify(msg));
        if (!this.app.get('allServerStarted')) {
            return UnitTools.result(-1, '服务器还没启动完毕');
        }

        // // 测试登录
        // await this.login(
        //     {
        //         type: 'yk',
        //         uuid: '77ae7f955f1547119577c53282234687',
        //         system: 'android',
        //         mobid: ''
        //     },
        //     session
        // );

        const self = this;
        const sessionService = self.app.get('sessionService');
        msg.ip = null;
        if (
            session.__session__ &&
            session.__session__.__socket__ &&
            session.__session__.__socket__.socket.client &&
            session.__session__.__socket__.socket.client.conn
        ) {
            const ip = session.__session__.__socket__.socket.client.conn.remoteAddress;

            const temp = ip.split('f:');

            if (temp[1]) {
                msg.ip = temp[1];
            }
        }
        // console.log(msg.uid, '连接');
        if (!msg || !msg.uid) {
            return UnitTools.result(4001, '没有用户信息');
        }

        // 保存当前sessionId到rpc参数中
        msg.sessionId = session.id;

        const currentSession = sessionService.getByUid(msg.uid);
        SlsLog.writeLog(session.uid, 'connector', '用户已连接' + session.id);
        // 判断当前用户是否登陆，踢掉以前登陆的
        if (currentSession) {
            for (let index = 0; index < currentSession.length; index++) {
                const otherSession = currentSession[index];
                SlsLog.writeLog(session.uid, 'connector', '踢掉其他玩家' + session.id + '-' + otherSession.id + '-' + otherSession.uid);
            }
            session.unbind(msg.uid);
            // sessionService.sendMessageByUid(msg.uid, { route: 'onMsg_other_login', message: '其他地方登陆了' });

            await sessionService.akick(msg.uid, '其他地方登陆了');
        }

        SlsLog.writeLog(session.uid, 'connector', '用户开始绑定' + session.id);

        const err = await session.abind(msg.uid);
        if (err) {
            SlsLog.writeLog(session.uid, 'connector', '同一个session重复登录' + session.id);
            return '同一个session重复登录';
        } else {
            SlsLog.writeLog(session.uid, 'connector', '用户绑定完毕' + session.id);
        }
        if (!!self.app.rpc.game.gameRemote && !!session) {
            return await self.app.rpc.game.gameRemote.enter(session, msg, self.app.get('serverId'));
        }

        let leaved = false;

        session.on('closed', function (reason, data) {
            // console.log('断开连接');
            if (leaved) {
                SlsLog.writeLog(session.uid, session.id, '重复离开房间，忽略' + '-' + data);
                return;
            }
            leaved = true;
            SlsLog.writeLog(session.uid, 'connector', '离开房间' + session.id + '-' + reason + '-' + data);
            self.app.rpc.game.gameRemote.close(reason, msg, self.app.get('serverId'));
        });

        session.on('unbind', function () {
            SlsLog.writeLog(session.uid, 'connector', '用户已解绑' + session.id);
        });

        session.on('disconnect', function () {
            SlsLog.writeLog(session.uid, 'connector', '用户已断开' + session.id);
        });

        // session.bind(uid);
        // session.set('rid', rid);
        // session.push('rid', function(err) {
        // 	if(err) {
        // 		console.error('set rid for session service failed! error is : %j', err.stack);
        // 	}
        // });
        // session.on('closed', Middle.test);

        // put user into channel
        // self.app.rpc.chat.chatRemote.add(session, uid, self.app.get('serverId'), rid, true, function(users){
        // 	next(null, {
        // 		users:users
        // 	});
        // });
    }

    async login(msg, session) {
        console.log('login', JSON.stringify(msg));
        if (!this.app.get('allServerStarted')) {
            return UnitTools.result(-1, '服务器还没启动完毕');
        }
        const self = this;
        msg.ip = null;
        if (
            session.__session__ &&
            session.__session__.__socket__ &&
            session.__session__.__socket__.socket.client &&
            session.__session__.__socket__.socket.client.conn
        ) {
            const ip = session.__session__.__socket__.socket.client.conn.remoteAddress;

            const temp = ip.split('f:');

            if (temp[1]) {
                msg.ip = temp[1];
            }
        }

        return await self.app.rpc.ws.wsRemote.login(session, msg, self.app.get('serverId'));

        // AppManage.login(msg).then(data => {
        // 	next(null, data);
        // }).catch(err => {
        // 	next(, UnitTools.result(-2, '服务器错误'));
        // })
    }

    /**
     * User log out handler
     *
     * @param {Object} app current application
     * @param {Object} session current session object
     *
     */
    // var onUserLeave = function(app, session) {
    // 	if(!session || !session.uid) {
    // 		return;
    // 	}
    // 	app.rpc.chat.chatRemote.kick(session, session.uid, app.get('serverId'), session.get('rid'), null);
    // };
}

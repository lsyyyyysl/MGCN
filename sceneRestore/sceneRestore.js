"use strict";
var _ = require("lodash"),
	Condicio = require("condicio"),
	View = require("./sceneRestore_view");
var log = require("../operationRecord");

var services = require("server-instance"),
	modules = {},
	userName = null;
var currentShowScene = null;//当前显示场景
var MESSAGES = require("finger").MESSAGES;

/**
 * @method 获取当前用户下的全部场景
 * @param {Function} callback 获取视角后的回调
 */
function getAllSceneUserName(callback) {
	// 获取全部场景服务
	services.getScenesByUserName(userName).done(function (sceneList) {
		if (sceneList) {
			_.forEach(sceneList, function (item) {
				(parseInt(item.isDefault) === 1) ? item.isDefault = true : item.isDefault = false; //解析默认状态
			});
		}
		callback(sceneList);
	}).fail(function (XMLHttpRequest, textStatus, errorThrown) {
		if (parseInt(XMLHttpRequest.status) === 200) {
			//TODO 没有一个场景时由系统创建一个场景
		} else {
			$.messager.show({
				msg : ($.i18n) ? $.i18n.prop("获取场景失败 ,请检查网络连接") : '获取场景失败 ,请检查网络连接',
				type : "error"
			});
		}
	});
}

/**
 * @method 刷新场景列表
 */
function refreshSceneList(currentSceneId) {
	getAllSceneUserName(function (sceneList) {
		if (currentShowScene !== null) {
			var sceneIndex = _.findIndex(sceneList, function (o) {
				return o.id === currentShowScene.id;
			});
			sceneList[sceneIndex].isShow = true;
		}
		View.initSceneEntries(sceneList, currentSceneId);
	});
}

View.updateSceneList.add(refreshSceneList);

/**
 * @method 根据ID删除某个场景
 * @param {String} sceneId 场景的ID
 * @param {Function} callback 成功删除后的回调
 */
function deleteSceneById(sceneId, callback) {
	//删除场景服务
	services.deleteScene(sceneId).done(function () {
		$.messager.show({
			msg : ($.i18n) ? $.i18n.prop("删除场景成功") : '删除场景成功',
			type : "success"
		});
		refreshSceneList();
		if (_.isFunction(callback)) {
			callback();
		}
		services.getScenesByUserName(userName).done(function (scene) {
			if (scene.length === 0) {
				enterDefaultScene(); //重新创建系统场景
			}
		})
	}).fail(function (XMLHttpRequest, textStatus, errorThrown) {
		$.messager.show({
			msg : ($.i18n) ? $.i18n.prop("删除场景失败,请检查网络链接") : '删除场景失败,请检查网络链接',
			type : "error"
		});
	});
}

View.onDeleteButtonClicked.add(deleteSceneById);//列表删除场景事件

/**
 * @method 设置默认场景
 * @param {String} SceneId 场景ID(没传则取当前视角)
 * @param {Function} callback 成功后的回调
 */
function setDefaultScene(SceneId, callback) {
	log.addOperationRecord();
	//设置默认场景服务
	services.setDefaultScene(userName, SceneId).done(function () {
		$.messager.show({
			msg : ($.i18n) ? $.i18n.prop("设置默认场景成功") : '设置默认场景成功',
			type : "success"
		});
		refreshSceneList();
		if (_.isFunction(callback)) {
			callback();
		}
	}).fail(function (XMLHttpRequest, textStatus, errorThrown) {
		$.messager.show({
			msg : ($.i18n) ? $.i18n.prop("设置默认场景失败, 请检查网络连接") : '设置默认场景失败, 请检查网络连接',
			type : "error"
		});
	});
}

View.setDefaultSceneClicked.add(setDefaultScene);//设置默认场景

/**
 * @method 修改场景的名称和备注
 * @param {Object} sceneInfo 修改后的场景信息
 * @param {Function} callback 保存成功的回调
 */
function changeSceneInfo(sceneInfo, callback) {
	//修改场景名和备注的服务
	services.updateScene(sceneInfo.id, sceneInfo.sceneName, sceneInfo.remark).done(function () {
		$.messager.show({
			msg : ($.i18n) ? $.i18n.prop("修改成功") : '修改成功',
			type : "success"
		});
		refreshSceneList();
		if (_.isFunction(callback)) {
			callback();
		}
	}).fail(function (XMLHttpRequest, textStatus, errorThrown) {
		$.messager.show({
			msg : ($.i18n) ? $.i18n.prop("修改场景信息失败,请检查网络链接") : '修改场景信息失败,请检查网络链接',
			type : "error"
		});
	});
}

View.onSaveChangedButtonClicked.add(changeSceneInfo);//修改场景信息事件
/**
 * @method 保存新增的场景
 * @param {Object} sceneInfo 场景信息
 */
function saveScene(sceneInfo, callback) {
	sceneInfo.userName = userName;
	//新增场景的服务
	services.saveScene(sceneInfo).done(function () {
		$.messager.show({
			msg : ($.i18n) ? $.i18n.prop("创建场景成功") : '创建场景成功',
			type : "success"
		});
		refreshSceneList();
		if (_.isFunction(callback)) {
			callback();
		}
	}).fail(function (XMLHttpRequest, textStatus, errorThrown) {
		$.messager.show({
			msg : ($.i18n) ? $.i18n.prop("创建场景失败,请检查网络链接") : '创建场景失败,请检查网络链接',
			type : "error"
		});
	});
}

View.onCreatedButtonClicked.add(saveScene);

/**
 * @method 根据ID进入到某个场景
 * @hide
 * @param {String} sceneId
 * @param {Function} callbck
 */
function enterSceneById(sceneId, callbck) {
	services.getSceneById(sceneId).done(function (scene) {
		if (currentShowScene !== null && scene.id === currentShowScene.id) {
			return false;
		}
		if (typeof callbck === "function") {
			callbck();
		}
		currentShowScene = scene;
		refreshSceneList(sceneId);
		scene.isCurrent = true;
		if (modules.multiViewPoint !== undefined) {
			modules.multiViewPoint.setSceneId(scene.id); //设置视角的场景id;
			modules.multiViewPoint.updateViewPointList(scene.angleviews); //刷新视角列表
			if (scene.angleviews.length > 0) {
				var viewPoint = _.find(scene.angleviews, function (viewPoint) {
					return viewPoint.isDefault === true;
				});
				if (viewPoint !== undefined && modules.multiViewPoint !== undefined) {
					modules.multiViewPoint.locateViewPointById(viewPoint.id); //跳转到默认场景的默认视角
				}
			}
		}

		if (modules.postil !== undefined) {
			modules.postil.removeAllPostilNode();//隐藏当前批注
			modules.postil.setSceneId(scene.id); //设置批注的场景id
			modules.postil.getTypes(scene.postils);//加载批注类型复选框
		}
	})
}

View.onSceneListClicked.add(enterSceneById);//列表进入场景事件
/**
 * @method 获取当前登录用户的默认场景
 * @hide
 * @param {Function} callback 回调函数
 */
function getDefaultScene(callback) {
	// 获取默认场景服务
	services.getDefaultSceneByUserName(userName).done(function (defaultScene) {
		callback(null, defaultScene)
	}).fail(function (XMLHttpRequest, textStatus, errorThrown) {
		callback(errorThrown);
	});

}

/**
 * @method 跳转至默认场景
 */
function enterDefaultScene() {
	services.getScenesByUserName(userName).done(function (scene) {
		if (scene.length === 0) {
			createAndEnterDefaultScene();
			return;
		} else {
			getDefaultScene(function (error, defaultScene) {
				if (defaultScene !== '') {
					enterSceneById(defaultScene.id);
				} else {
					// 有场景但没有默认场景
					createAndEnterDefaultScene();
				}
			})
		}
	})
}

/**
 * @method 创建系统默认场景并进入
 */
function createAndEnterDefaultScene() {
	var newScene = {
		userName : userName,
		sceneName : ($.i18n) ? $.i18n.prop("系统创建场景") : '系统创建场景',
		isDefault : 1,
		remark : ""
	};

	services.saveScene(newScene).done(function (systemScene) {
		enterSceneById(systemScene.id);
		services.setDefaultScene(userName, systemScene.id); //设为默认;
		$.messager.show({
			msg : ($.i18n) ? $.i18n.prop("系统已为您创建默认场景") : '系统已为您创建默认场景',
			type : "info"
		});
	})
}

module.exports = {
	id : "scene",
	name : ($.i18n) ? $.i18n.prop("场景") : '场景',
	setDependentModule : function (dependentModule) {
		Condicio.checkIsObject(dependentModule, "The type of dependentModule must be 'Object'!");
		modules = _.assign(modules, dependentModule);
	},
	setState : function (state) {
		Condicio.checkNotUndefined(state, "state must't be 'Undefined'!");
		Condicio.checkNotUndefined(state.userInfo.userName, "userName must't be 'Undefined'!");
		userName = state.userInfo.userName;
		$(document).on(MESSAGES.LOADED_MODELS, function (event, data) {
			enterDefaultScene();
		});
	},
	showAllPostils : function () {
		if (currentShowScene) {
			services.getSceneById(currentShowScene.id).done(function (scene) {
				currentShowScene = scene;
				modules.postil.showAllPostil(currentShowScene.postils);
			});
		}
	},
	removeAllPostils : function () {
		if (modules.postil && currentShowScene) {
			modules.postil.removeAllPostilNode();
		}
	},
	entries : [{
		id : "scene_manager",
		name : ($.i18n) ? $.i18n.prop("场景管理") : '场景管理',
		type : "AppMenu-right",
		render : function ($container) {
			services.getPermissionData().done(function (permissionData) {
				var hasPermission = services.hasPermission(permissionData, "sceneManager");
				View.init($container);
				if (!hasPermission) {
					$("#scene_entries_warp").hide();
				}
			})
		}
	}]
};
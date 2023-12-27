"use strict";
var $ = require("jquery"),
	_ = require("lodash");
var log = require("../operationRecord");
var sceneRestoreEntriesTemplate = require("./sceneRestoreEntries.handlebars"),
	sceneRestoreListTemplate = require("./sceneRestoreList.handlebars"),
	$panelContainer = null,
	SCENE_MANAGE = "场景管理";
var i18nExtend = require("i18n-extend");
var editIndex = null,
	sceneList = null,
	$table = null,
	isfirstCheck = null,
	checkedSceneId = null;

require("./sceneRestore.css");

/**
 * @method 初始化页面元素
 */
function init($container) {
	$container.append(sceneRestoreEntriesTemplate({
		sceneManage : ($.i18n) ? $.i18n.prop(SCENE_MANAGE) : SCENE_MANAGE
	}));
	$("body").append(sceneRestoreListTemplate());
	i18nExtend.translatePosterity($container);
	i18nExtend.translatePosterity($('#scene_list_warp'));
	$panelContainer = $(".sceneRestore-container");
	$panelContainer.hide();
}

function initSceneEntries(_sceneList, currentSceneId) {
	sceneList = _sceneList;
	$('#scene_entries_list').combobox({
		valueField : 'id',
		textField : 'sceneName',
		height: '22px',
		data : sceneList,
		onSelect : function (record) {
			log.addOperationRecord();
			checkedSceneId = record.id;
			onSceneListClicked.fire(record.id, function () {
				$.messager.show({
					msg : ($.i18n) ? $.i18n.prop("enterScene", record.sceneName) : '已进入'+ record.sceneName+'场景，保存视角和批注操作将保存到该场景下',
					type : "info"
				});
			});
		},
		onShowPanel: function () {
			if (sceneList.length == 0) {
				$(this).combobox('panel').height(22);
			} else if (sceneList.length > 5) {
				$(this).combobox('panel').height(135);
			} else {
				$(this).combobox('panel').height("auto");
			}
		}
	});

	checkedSceneId = currentSceneId == undefined ? checkedSceneId : currentSceneId;
	$('#scene_entries_list').combobox("setValue", checkedSceneId);
	$("#scene_manager_btn").unbind().bind('click', function () {
		initSceneManagerPanel();
		updateSceneList.fire();
		editIndex = null;
	});
	if ($table) {
		loadgridData(sceneList);
	}
}

function initSceneManagerPanel() {
	var deleteScene = ($.i18n) ? $.i18n.prop("删除") : "删除",
		editScene = ($.i18n) ? $.i18n.prop("编辑") : "编辑",
		saveScene = ($.i18n) ? $.i18n.prop("保存") : "保存";
	$("#scene_list_warp").window({
		title : ($.i18n) ? $.i18n.prop('场景管理') : '场景管理',
		draggable : true,
		minimizable : false,
		maximizable : false,
		shadow : false,
		collapsible : false
	});
	$table = $("#scene_list");
	var operationName = ($.i18n) ? $.i18n.prop("操作") : '操作';
	var width = $("#scene_entries_list").width();
	$table.datagrid({
		autoRowHeight : true,
		fitColumns : true,
		autoSizeColumn : true,
		singleSelect : true,
		selectOnCheck : false,
		striped : true,
		nowrap : false,
		checkOnSelect : false,
		scrollbarSize: 0,
		columns : [[
			{
				field : "isDefault",
				title : ($.i18n) ? $.i18n.prop("默认") : '默认',
				checkbox : true
			},
			{
				field : "sceneName",
				title : ($.i18n) ? $.i18n.prop("名称") : '名称',
				editor : "text",
				align : "center",
				width : width * 0.24,
				resizable : true,
				formatter : function (value, row, index) {
					if (value === undefined || value === null || value === '') {
						value = '';
					}
					return '<span title=' + value.replace(/ /g, '&#32;') + '>' + value + '</span>';
				}
			},
			{
				field : "remark",
				title : ($.i18n) ? $.i18n.prop("备注") : '备注',
				editor : "text",
				align : "center",
				width : width * 0.5,
				resizable : true,
				formatter : function (value, row, index) {
					if (value === undefined || value === null || value === '') {
						value = '';
					}
					return '<span title=' + value.replace(/ /g, '&#32;') + '>' + value + '</span>';
				}
			},
			{
				field : "operation",
				title : "<span class='scene-operation'>" + operationName + "</span>",
				width : width * 0.24,
				align : "center",
				resizable : true,
				formatter : function (value, row, index) {
					row = JSON.stringify(row).replace(/\"/g, "'");
					var deleteElement = '<a href="javascript:void(0);" class="scene-delete-btn i18n-beacon" id="scene_delete_btn_' + index + '" onclick="deleteRow(' + index + ',' + row + ')">' + deleteScene+ '</a>';
					var editElement = '<a href="javascript:void(0);" class="scene-edit-btn i18n-beacon" id="scene_edit_btn_' + index + '" onclick="editRowCallback(' + index + ',' + row + ')">' + editScene + '</a>';
					var saveElement = '<a href="javascript:void(0);" class="scene-save-btn i18n-beacon" id="scene_save_btn_' + index + '" onclick="saveCallback()"> ' + saveScene + '</a>';
					return deleteElement + editElement + saveElement;
				}
			}
		]],
		toolbar : [{
			iconCls : 'icon-add',
			handler : function () {
				log.addOperationRecord();
				endEdit(function () {
					$table.datagrid('appendRow', {
						sceneName : ($.i18n) ? $.i18n.prop("新建场景") : '新建场景'
					});
					var rows = $table.datagrid('getRows');
					editRow(rows.length - 1, rows[rows.length - 1]);
				});
			}
		}],
		onLoadSuccess : function (data) {
			//加宽checkbox的列宽度
			$(".datagrid-header-check").css('width', "50px");
			$(".datagrid-cell-check").css('width', "50px");
			if ($.i18n && $.i18n.getLocale() === 'en') {
				$('.scene-delete-btn').css({
					paddingLeft : '13%'
				});
				$('.scene-operation').css({
					paddingLeft : '25%'
				});
			} else {
				$('.scene-delete-btn').css({
					paddingLeft : '22%'
				});
				$('.scene-operation').css({
					paddingLeft : '35%'
				});
			}
			isfirstCheck = true;
			//勾选默认场景
			_.map(sceneList, function (row, rowIndex) {
				if (row.isDefault) {
					$table.datagrid("checkRow", rowIndex);
					return;
				}
			});
			isfirstCheck = false;
		},
		onCheck : function (index, rowData) {
			if (isfirstCheck) {
				isfirstCheck = false;
			} else {
				endEdit();
				if (rowData.id) {
					setDefaultSceneClicked.fire(rowData.id);
				} else {
					$.messager.show({
						type : "warning",
						msg : ($.i18n) ? $.i18n.prop("请先保存该场景，再设置默认场景") : '请先保存该场景，再设置默认场景'
					});
				}
			}
		},
		onUncheck : function (rowIndex, rowData) {
			isfirstCheck = true;
			$table.datagrid('checkRow', rowIndex);
		},
		onSelect : function (index, rowData) {

		}
	});

	loadgridData(sceneList);
	//隐藏checkbox表头
	$("#scene_list_warp").find("div .datagrid-header-check").children("input[type=\"checkbox\"]").eq(0).attr("style", "display:none;");
	var defaultName = ($.i18n) ? $.i18n.prop('默认') : '默认';
	$("#scene_list_warp").find("div .datagrid-header-check").append("<span style='font-size:12px' class='i18n-beacon'>" + defaultName + "</span>");
}

var deleteRow = function (rowIndex, row) {
	if (row.isShow) {
		$.messager.show({
			type : "warning",
			msg : ($.i18n) ? $.i18n.prop("无法删除当前显示场景") : '无法删除当前显示场景'
		});
	} else {
		log.addOperationRecord();
		if (!row.id) {
			$table.datagrid('deleteRow', rowIndex);
		} else {
			onDeleteButtonClicked.fire(row.id, function () {
				loadgridData(sceneList);
			});
		}
		editIndex = null;
	}
	var e = window.event || e;
	if (e.stopPropagation) {
		e.stopPropagation();
	} else {
		e.cancelBubble = true;
	}
};

var editRow = function (rowIndex, row) {
	var SCENE_NAME_MAX_LENGTH = 200;
	$table.datagrid('beginEdit', rowIndex);
	if ($.i18n && $.i18n.getLocale() === 'en') {
		$("#scene_delete_btn_" + rowIndex).css({
			paddingLeft : '13%'
		});
		$('.scene-operation').css({
			paddingLeft : '25%'
		});
	} else {
		$("#scene_delete_btn_" + rowIndex).css({
			paddingLeft : '22%'
		});
		$('.scene-operation').css({
			paddingLeft : '35%'
		});
	}
	$("#scene_edit_btn_" + rowIndex).css('display', 'none');
	$("#scene_save_btn_" + rowIndex).css('display', 'inline');
	$(".datagrid-header-check").css('width', "50px");
	$(".datagrid-cell-check").css('width', "50px");
	$("[field='sceneName']").find(":text").attr('maxLength', SCENE_NAME_MAX_LENGTH);
	$("[field='sceneName']").find(":text").on('keyup', function (e) {
		if (this.value.length === SCENE_NAME_MAX_LENGTH) {
			$.messager.show({
				msg : ($.i18n) ? $.i18n.prop("sceneNameMax", SCENE_NAME_MAX_LENGTH) : '场景名称最多只支持输入'+SCENE_NAME_MAX_LENGTH +'个字符',
				type : 'warning'
			});
		}
	});
	$("[field='remark']").find(":text").attr('maxLength', 60);
	$("[field='remark']").find(":text").on('keyup', function (e) {
		if (this.value.length === 60) {
			$.messager.show({
				msg : ($.i18n) ? $.i18n.prop("sceneTipMax", 60) : '场景备注最多只支持输入60个字符',
				type : 'warning'
			});
		}
	});
	var $sceneName = $("#scene_list_warp").find("[datagrid-row-index=" + rowIndex + "]").find("[field='sceneName']").find(".datagrid-editable-input");
	$sceneName.focus();
	editIndex = rowIndex;
	var e = window.event || e;
	if (e.stopPropagation) {
		e.stopPropagation();
	} else {
		e.cancelBubble = true;
	}
};

//在window对象上添加一个删除行的方法，便于初始化"删除","编辑"和"保存"按钮的时候可以直接绑定事件
window.deleteRow = deleteRow;
window.editRowCallback = function (rowIndex, row) {
	endEdit(function () {
		editRow(rowIndex, row);
	});
};
window.saveCallback = endEdit;

function endEdit(callback) {
	if (editIndex === 0 || editIndex) {
		var rows = $table.datagrid('getRows'),
			row = rows[editIndex];

		$table.datagrid('endEdit', editIndex);
		if ($.i18n && $.i18n.getLocale() === 'en') {
			$("#scene_delete_btn_" + editIndex).css({
				paddingLeft : '13%'
			});
			$('.scene-operation').css({
				paddingLeft : '25%'
			});
		} else {
			$("#scene_delete_btn_" + editIndex).css({
				paddingLeft : '22%'
			});
			$('.scene-operation').css({
				paddingLeft : '35%'
			});
		}
		$("#scene_edit_btn_" + editIndex).css('display', 'inline');
		$("#scene_save_btn_" + editIndex).css('display', 'none');
		if (row.id) {
			log.addOperationRecord();
			onSaveChangedButtonClicked.fire(row, callback);
		} else {
			onCreatedButtonClicked.fire(row, callback);
		}
		$(".datagrid-header-check").css('width', "50px");
		$(".datagrid-cell-check").css('width', "50px");
		editIndex = null;
	} else {
		if (_.isFunction(callback)) {
			callback();
		}
	}
}

function loadgridData(sceneList) {
	$table.datagrid('loadData', sceneList);
}

/**
 * @method 显示面板
 */
function showPanel(scenelist) {
	$("#scene_list").panel('open');
	loadgridData(scenelist);
}

var onCreatedButtonClicked = $.Callbacks("unique");
var onSaveChangedButtonClicked = $.Callbacks("unique");
var setDefaultSceneClicked = $.Callbacks("unique");
var onDeleteButtonClicked = $.Callbacks("unique");
var onSceneListClicked = $.Callbacks("unique");
var updateSceneList = $.Callbacks("unique");

exports.showPanel = showPanel;
exports.init = init;
exports.onCreatedButtonClicked = onCreatedButtonClicked;
exports.onSceneListClicked = onSceneListClicked;
exports.onSaveChangedButtonClicked = onSaveChangedButtonClicked;
exports.setDefaultSceneClicked = setDefaultSceneClicked;
exports.onDeleteButtonClicked = onDeleteButtonClicked;
exports.updateSceneList = updateSceneList;
exports.initSceneEntries = initSceneEntries;
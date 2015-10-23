/**
 * @fileoverview RowList 클래스파일
 * @author NHN Ent. FE Development Team
 */
'use strict';

var Model = require('../base/model');
var util = require('../util');

/**
 * Row Model
 * @module model/row
 */
var Row = Model.extend(/**@lends module:model/row.prototype */{
    /**
     * @constructs
     * @extends module:base/model
     * @param  {object} attributes - Attributes
     * @param  {object} options - Options
     */
    initialize: function(attributes, options) { // eslint-disable-line no-unused-vars
        var dataModel, rowKey, rowData;

        Model.prototype.initialize.apply(this, arguments);

        dataModel = this.grid.dataModel;
        rowKey = attributes && attributes['rowKey'];
        rowData = dataModel.get(rowKey);

        this.setOwnProperties({
            dataModel: dataModel,
            columnModel: this.grid.columnModel,
            renderModel: this.grid.renderModel
        });

        if (rowData) {
            this.listenTo(rowData, 'change restore', this._onDataModelChange);
            this.listenTo(rowData, 'extraDataChanged', this._setRowExtraData);
        }
    },

    idAttribute: 'rowKey',

    /**
     * dataModel 이 변경시 model 데이터를 함께 업데이트 하는 핸들러
     * @param {Object} model    변경이 발생한 row 모델
     * @private
     */
    _onDataModelChange: function(model) {
        _.each(model.changed, function(value, columnName) {
            if (columnName === '_extraData') {
                this._setRowExtraData();
            } else {
                this.setCell(columnName, {
                    value: value
                });
            }
        }, this);
    },

    /**
     * extra data 를 토대로 rowSpanned 된 render model 의 정보를 업데이트 한다.
     * @private
     */
    _setRowExtraData: function() {
        var dataModel = this.dataModel,
            row = dataModel.get(this.get('rowKey')),
            columnModelList = this.columnModel.getVisibleColumnModelList(),
            rowState = row.getRowState(),
            param;

        if (ne.util.isUndefined(this.collection)) {
            return;
        }

        _.each(columnModelList, function(columnModel) {
            var columnName = columnModel['columnName'],
                cellData = this.get(columnName),
                rowModel = this,
                isEditable, isDisabled;

            if (!ne.util.isUndefined(cellData)) {
                isEditable = row.isEditable(columnName);
                isDisabled = (columnName === '_button') ? rowState.isDisabledCheck : rowState.isDisabled;
                if (dataModel.isRowSpanEnable() && !cellData['isMainRow']) {
                    rowModel = this.collection.get(cellData['mainRowKey']);
                }
                if (rowModel) {
                    param = {
                        isDisabled: isDisabled,
                        isEditable: isEditable,
                        className: row.getClassNameList(columnName).join(' ')
                    };
                    rowModel.setCell(columnName, param);
                }
            }
        }, this);
    },

    /**
     * Backbone 이 collection 생성 시 내부적으로 parse 를 호출하여 데이터를 형식에 맞게 가공한다.
     * @param {Array} data  원본 데이터
     * @return {Array}  형식에 맞게 가공된 데이터
     */
    parse: function(data) {
        return this._formatData(data);
    },

    /**
     * 데이터를 View 에서 사용할 수 있도록 가공한다.
     * @param {Array} data  원본 데이터
     * @return {Array}  가공된 데이터
     * @private
     */
    _formatData: function(data) {
        var grid = this.grid || this.collection.grid,
            dataModel = grid.dataModel,
            rowKey = data['rowKey'],
            row = dataModel.get(rowKey),
            rowState = row.getRowState(),
            isDisabled = rowState.isDisabled;

        _.each(data, function(value, columnName) {
            var rowSpanData,
                isEditable = row.isEditable(columnName);

            if (columnName !== 'rowKey' && columnName !== '_extraData') {
                if (dataModel.isRowSpanEnable() &&
                    data['_extraData'] && data['_extraData']['rowSpanData'] &&
                    data['_extraData']['rowSpanData'][columnName]) {
                    rowSpanData = data['_extraData']['rowSpanData'][columnName];
                } else {
                    rowSpanData = {
                        mainRowKey: rowKey,
                        count: 0,
                        isMainRow: true
                    };
                }
                isDisabled = (columnName === '_button') ? rowState.isDisabledCheck : isDisabled;

                data[columnName] = {
                    rowKey: rowKey,
                    columnName: columnName,
                    value: value,
                    //Rendering properties
                    rowSpan: rowSpanData.count,
                    isMainRow: rowSpanData.isMainRow,
                    mainRowKey: rowSpanData.mainRowKey,
                    //Change attribute properties
                    isEditable: isEditable,
                    isDisabled: isDisabled,
                    optionList: [],
                    className: row.getClassNameList(columnName).join(' '),

                    changed: []    //변경된 프로퍼티 목록들
                };
            }
        }, this);
        return data;
    },

    /**
     * Cell 의 값을 변경한다.
     * - 참조형 데이터 타입이기 때문에 change 이벤트 발생을 위해 이 method 를 사용하여 값 변경을 수행한다.
     * @param {String} columnName   컬럼명
     * @param {{key: value}} param  key:value 로 이루어진 셀에서 변경할 프로퍼티 목록
     */
    setCell: function(columnName, param) {
        var isValueChanged = false,
            changed = [],
            rowIndex, rowKey, data;

        if (!this.get(columnName)) {
            return;
        }

        rowKey = this.get('rowKey');
        data = _.clone(this.get(columnName));

        _.each(param, function(changeValue, name) {
            if (!util.isEqual(data[name], changeValue)) {
                isValueChanged = (name === 'value') ? true : isValueChanged;
                data[name] = changeValue;
                changed.push(name);
            }
        }, this);

        if (changed.length) {
            data['changed'] = changed;
            this.set(columnName, data);
            if (isValueChanged) {
                //value 가 변경되었을 경우 relation 을 수행한다.
                rowIndex = this.dataModel.indexOfRowKey(rowKey);
                this.trigger('valueChange', rowIndex);
            }
        }
    }
});

module.exports = Row;

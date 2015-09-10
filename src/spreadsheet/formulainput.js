(function(f, define){
    define([ "../kendo.core" ], f);
})(function(){

(function(kendo, window) {
    var $ = kendo.jQuery;
    var Widget = kendo.ui.Widget;
    var ns = ".kendoFormulaInput";
    var keys = kendo.keys;
    var classNames = {
        wrapper: "k-spreadsheet-formula-input"
    };
    var styles = [
        "font-family",
        "font-size",
        "font-stretch",
        "font-style",
        "font-weight",
        "letter-spacing",
        "text-transform",
        "line-height"
    ];

    //move to core
    var KEY_NAMES = {
        27: 'esc',
        37: 'left',
        39: 'right',
        35: 'end',
        36: 'home',
        32: 'spacebar'
    };

    var FORMULA_LOOKAHEAD = /(?!=)(\w)([a-zA-Z])*(\S| )?/;
    var FORMULA_START_SYMBOLS = {
        "=": true,
        "(": true,
        ",": true
    };

    var FormulaInput = Widget.extend({
        init: function(element, options) {
            Widget.call(this, element, options);

            element = this.element;

            element.addClass(FormulaInput.classNames.wrapper)
                   .attr("contenteditable", true);

            if (this.options.autoScale) {
                element.on("input", this.scale.bind(this));
            }

            this._formulaSource();

            this._formulaList();

            this._popup();

            element.on("keydown", this._keydown.bind(this));
            element.on("keyup", this._keyup.bind(this));
            element.on("blur", this._blur.bind(this));
        },

        options: {
            name: "FormulaInput",
            autoScale: false,
            filterOperator: "startswith",
            scalePadding: 30,
            minLength: 1
        },

        _formulaSource: function() {
            var result = [];
            var value;

            for (var key in kendo.spreadsheet.calc.runtime.FUNCS) {
                value = key.toUpperCase();
                result.push({ value: value, text: value });
            }

            this.formulaSource = new kendo.data.DataSource({ data: result });
        },

        _formulaList: function() {
            this.list = new kendo.ui.StaticList($("<ul/>").insertAfter(this.element), {
                autoBind: false,
                selectable: true,
                change: this._formulaListChange.bind(this),
                dataSource: this.formulaSource,
                dataValueField: "value",
                template: "#:data.value#"
            });

            this.list.element.on("mousedown", function(e) {
                e.preventDefault();
            });
        },

        _formulaListChange: function() {
            var selection = window.getSelection();
            var node = selection.focusNode;

            var value = this.list.value();
            var startIdx, endIdx, character;
            var nodeValue;

            if (!node || !value || this._mute) {
                return;
            }

            if (node.nodeType === 3) {
                nodeValue = node.nodeValue;

                startIdx = endIdx = selection.focusOffset;
                while(startIdx > 0) {
                    if (FORMULA_START_SYMBOLS[nodeValue[startIdx - 1]]) {
                        break;
                    }

                    startIdx -= 1;
                }

                node.nodeValue = nodeValue.substr(0, startIdx) + value + nodeValue.substring(endIdx);
            }

            this.scale();
            this.popup.close();
            this.caretToEnd(); //need to move the caret to the end of the this.formulaList.value()... not to the end of the input
        },

        _popup: function() {
            this.popup = new kendo.ui.Popup(this.list.element, {
                anchor: this.element
            });
        },

        _blur: function() {
            this.popup.close();
        },

        _isFormula: function() {
            return this.element.text()[0] === "=";
        },

        _keydown: function(e) {
            var key = e.keyCode;

            if (KEY_NAMES[key]) {
                this.popup.close();
                this._navigated = true;
            } else  if (this._move(key)) {
                this._navigated = true;
                e.preventDefault();
            }
        },

        _keyup: function(e) {
            var value;

            if (this._isFormula() && !this._navigated) {
                value = this._searchValue();

                this.filter(value);

                if (!value || !this.formulaSource.view().length) {
                    this.popup.close();
                } else {
                    this.popup.open();
                }
            }

            this._navigated = false;
        },

        _move: function(key) {
            var list = this.list;
            var pressed = false;

            if (key === keys.DOWN) {
                list.focusNext();
                if (!list.focus()) {
                    list.focusFirst();
                }
                pressed = true;
            } else if (key === keys.UP) {
                list.focusPrev();
                if (!list.focus()) {
                    list.focusLast();
                }
                pressed = true;
            } else if (key === keys.ENTER) {
                list.select(list.focus());
                this.popup.close();
                pressed = true;
            } else if (key === keys.PAGEUP) {
                list.focusFirst();
                pressed = true;
            } else if (key === keys.PAGEDOWN) {
                list.focusLast();
                pressed = true;
            }

            return pressed;
        },

        _searchValue: function() {
            var selection = window.getSelection();
            var value = selection.focusNode.nodeValue;

            if (!value) {
                return value;
            }

            value = value.split(/\(|,/);
            value = value[value.length - 1];

            value = FORMULA_LOOKAHEAD.exec(value);

            return value ? value[0] : value;
        },

        _sync: function() {
            if (this._editorToSync && this.isActive()) {
                this._editorToSync.value(this.value());
            }
        },

        _textContainer: function() {
            var computedStyles = kendo.getComputedStyles(this.element[0], styles);

            computedStyles.position = "absolute";
            computedStyles.visibility = "hidden";
            computedStyles.top = -3333;
            computedStyles.left = -3333;

            this._span = $("<span/>").css(computedStyles).insertAfter(this.element);
        },

        isActive: function() {
            return this.element.is(":focus");
        },

        caretToEnd: function() {
            var nodes = this.element[0].childNodes;
            var length = nodes.length;

            if (!length || !this.isActive()) {
                return;
            }

            var selection = window.getSelection();
            var range = document.createRange();

            range.setStartAfter(nodes[nodes.length - 1]);

            selection.removeAllRanges();
            selection.addRange(range);
        },

        filter: function(value) {
            if (!value || value.length < this.options.minLength) {
                return;
            }

            this._mute = true;
            this.list.select(-1);
            this._mute = false;

            this.formulaSource.filter({
                field: this.list.options.dataValueField,
                operator: this.options.filterOperator,
                value: value
            });
        },

        hide: function() {
            this.element.hide();
        },

        show: function() {
            this.element.show();
        },

        position: function(rectangle) {
            if (!rectangle) {
                return;
            }

            this.element
                .show()
                .css({
                    "top": rectangle.top + "px",
                    "left": rectangle.left + "px"
                });
        },

        resize: function(rectangle) {
            if (!rectangle) {
                return;
            }

            this.element.css({
                width: rectangle.width,
                height: rectangle.height
            });
        },

        syncWith: function(formulaInput) {
            var eventName = "input" + ns;

            this._editorToSync = formulaInput;
            this.element.off(eventName).on(eventName, this._sync.bind(this));
        },

        scale: function() {
            var element = this.element;
            var width;

            if (!this._span) {
                this._textContainer();
            }

            this._span.html(element.html());

            width = this._span.width() + this.options.scalePadding;

            if (width > element.width()) {
                element.width(width);
            }
        },

        value: function(value) {
            if (value === undefined) {
                return this.element.text();
            }

            this.element.text(value);
        },

        destroy: function() {
            this._editorToSync = null;

            this.element.off(ns);

            this.popup.destroy();
            this.popup = null;

            Widget.fn.destroy.call(this);
        }
    });

    kendo.spreadsheet.FormulaInput = FormulaInput;
    $.extend(true, FormulaInput, { classNames: classNames });
})(kendo, window);
}, typeof define == 'function' && define.amd ? define : function(_, f){ f(); });

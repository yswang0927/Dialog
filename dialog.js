/**
 * Dialog
 * @author yswang
 * @version 4.0.1 2014/6/26
 */
;(function (window, document, undefined) {
	
	var _isIE6 = !-[1,]&&!window.XMLHttpRequest, doc = document,
	
	_isFunc = function(func) {
		return func && typeof func === 'function';
	},
	
	// 获取最顶层的window对象
	_topWin = (function() {
		var twin = window;
		while(twin.parent && twin.parent !== twin) {
		  try { 
				// 跨域
				if(twin.parent.document.domain !== doc.domain) {
					break;
				} 
		  } catch(e) {
				break;
		  }
			twin = twin.parent;
		};
		return twin;
	})(),
	
	// 计算window相关尺寸
	_winSize = function(win) {
		win = win || window;
	    var doc = win.document,
				cw = doc.compatMode === "BackCompat" ? doc.body.clientWidth : doc.documentElement.clientWidth,
		    ch = doc.compatMode === "BackCompat" ? doc.body.clientHeight : doc.documentElement.clientHeight,
		    sl = Math.max(doc.documentElement.scrollLeft, doc.body.scrollLeft),
		    st = Math.max(doc.documentElement.scrollTop, doc.body.scrollTop),
		    sw = Math.max(doc.documentElement.scrollWidth, doc.body.scrollWidth),
		    sh = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight);
	    
		if(sh < ch) { sh=ch; }
	  return { "cw": cw, "ch": ch, "sl": sl, "st": st, "sw": sw, "sh": sh };
	},
	
  // 获取相对文档的坐标
  _offset = function (elem) {
      var box = elem.getBoundingClientRect(),
          eDoc = elem.ownerDocument,
          body = eDoc.body,
          docElem = eDoc.documentElement,
          ct = docElem.clientTop || body.clientTop || 0,
          cl = docElem.clientLeft || body.clientLeft || 0,
          top = box.top + (self.pageYOffset || docElem.scrollTop) - ct,
          left = box.left + (self.pageXOffset || docElem.scrollLeft) - cl;

      return { 'left': left, 'top': top };
  },
	
	// 事件处理
	_EventHandler = (function() {
		var i = 1, listeners = {};
		return {
			bind: function(elem, type, callback, useCapture) {
				var _capture = useCapture !== undefined ? useCapture : false;
				elem.addEventListener ? elem.addEventListener(type, callback, _capture) 
									  : elem.attachEvent('on' + type, callback);
			},
			unbind: function(elem, type, callback, useCapture){
				var _capture = useCapture !== undefined ? useCapture : false;
				elem.removeEventListener ? elem.removeEventListener(type, callback, _capture) 
						                 : elem.detachEvent('on' + type, callback);
			},
			add: function(elem, type, callback) {
				_EventHandler.bind(elem, type, callback, false);
				listeners[i] = {"elem": elem, "type": type, "callback": callback, "capture": false};
				return (i++);
			},
			remove: function(id) {
				if (listeners.hasOwnProperty(id)) {
					var h = listeners[id];
					_EventHandler.unbind(h.elem, h.type, h.callback, h.capture);
					delete listeners[id];
				}
			},
			fix: function(evt) {
				var sl = Math.max(doc.documentElement.scrollLeft, doc.body.scrollLeft),
					st = Math.max(doc.documentElement.scrollTop, doc.body.scrollTop),
					eventObj = {
						target: evt.srcElement || evt.target,
						pageX: (evt.clientX + sl - doc.body.clientLeft),
						pageY: (evt.clientY + st - doc.body.clientTop),
						preventDefault: function () {evt.returnValue = false;},
						stopPropagation: function () {evt.cancelBubble = true;}
					};
				
				// IE6/7/8 在原生window.event对象写入数据会导致内存无法回收，应当采用拷贝
				for(var i in evt) {
					eventObj[i] = evt[i];
				}
				
				return eventObj;
			},
			stop: function(evt) {
				if(evt.stopPropagation) {
					evt.preventDefault();
					evt.stopPropagation();
				}else {
					evt.cancelBubble = true;
					evt.returnValue = false;
				}
			}
		};
	})(),
	
	// css相关操作
	_css = (function(){
		return {
			'get': ('defaultView' in doc) && ('getComputedStyle' in doc.defaultView) ?
				function (elem, name) {
					// borderLeftWidth 格式变为 border-left-width格式
					name = name.replace(/([A-Z]|^ms)/g, "-$1").toLowerCase();
					return doc.defaultView.getComputedStyle(elem, false).getPropertyValue(name);
				} : function (elem, name) {
					// border-left-width 格式变为 borderLeftWidth 格式
					name = name.replace(/^-ms-/, "ms-").replace(/-([a-z]|[0-9])/ig, function(all, letter) {
						return (letter + "").toUpperCase();
					});	
					return elem.currentStyle[name];
			},
			'has': function(elem, clsname) {
				return new RegExp("(^|\\s)" + clsname + "(\\s|$)").test(elem.className);
			},
			'add': function(elem, clsname) {
				!_css.has(elem, clsname) && (elem.className += (' '+ clsname));
			},
			'remove': function(elem, clsname) {
				_css.has(elem, clsname) && (elem.className = elem.className.replace(new RegExp("(^|\\s)" + clsname + "(\\s|$)"), ' ').replace(/^\s+|\s+$/g, ''));
			}
		};
	})();
	
	_int = function(str, defVal) {
		var val = parseInt(str, 10);
		return isNaN(val) ? defVal : val;
	},
	
	// 获取url中的参数
	_queryParam = function(url, name){
		var sUrl = url.slice(url.indexOf('?') + 1),
			r = sUrl.match(new RegExp("(^|&)" + name + "=([^&]*)(&|$)"));
		return (r == null ? null : unescape(r[2]));
	},
	
	// 支持innerHTML中包含<style>和<script>脚本
	_innerHTML = function(el, htmlCode, win) {
		if(!el || htmlCode == null || typeof htmlCode == 'undefined') { 
			return; 
		}
		
		// for IE innerHTML css style hack
		htmlCode = '<span style="display:none;">for IE css hack</span>'+ htmlCode;
		el.innerHTML = htmlCode;
		// for IE css hack
		el.removeChild(el.firstChild);
		
		var scripts = el.getElementsByTagName('script'), 
			oScript = null, srcs= [], loaded = [], text = [], i, 
			eDoc = el.ownerDocument, 
			head = eDoc.getElementsByTagName('head')[0] || eDoc.documentElement;
		
		// 动态执行脚本
		var evalScript = function(data) {
			var script = eDoc.createElement("script");
		    script.type = "text/javascript";
		    try {
		      script.appendChild(eDoc.createTextNode(data));      
		    } catch(e) {
		      // IE hack
		      script.text = data;
		    }

		    head.insertBefore(script, head.firstChild);
		    head.removeChild(script);
		    script = null;
		};
		
		if(!scripts || scripts.length === 0) {
			eDoc = head = null;
			return;
		}
		
		for(i = 0; i < scripts.length; i++) {
			oScript = scripts[i];
			// 不是标准的script脚本，不进行额外处理
			if(oScript.type && oScript.type.toLowerCase() !== 'text/javascript') {
				continue;
			}

			if(oScript.src) {
				srcs.push(oScript.src);
				loaded.push(0);
			} else {
				text.push(oScript.text || oScript.textContent || oScript.innerHTML || '');
			}
		}
		
		if(srcs.length === 0) {
			evalScript(text.join(' '));
			eDoc = head = null;
			return;
		}
		
		for(i = 0; i < srcs.length; i++) {
			(function(a){
				var script = eDoc.createElement('script');
				script.setAttribute("type", "text/javascript");
				try {
					script.setAttribute("defer", "defer");
				} catch(e){}
				
				script.setAttribute("src", srcs[a]);
				script.onload = script.onreadystatechange = function() {
					if(!loaded[a] && 
						(!this.readyState || this.readyState === 'loaded' || this.readyState === 'complete')) {
						loaded[a] = 1;
						script.onload = script.onreadystatechange = null;
						if(head && script.parentNode) {
							head.removeChild(script);
							script = null;
						}
					}
				};
				
				head.insertBefore(script, head.firstChild);
			})(i);
		}
		
		// 保证所有js文件全部加载完毕后才进行script代码执行
		var checkDone = function() {
			var s = 0;
			for(var i = 0; i < loaded.length; i++) {
				s += loaded[i];
			}
			
			var done = (s === loaded.length);
			if(done) {
				window.clearTimeout(window['__scriptLoaded_tid']);
				evalScript(text.join(' '));
				eDoc = head = null;
				return;
			}
			
			window['__scriptLoaded_tid'] = window.setTimeout(function() {
				window.clearTimeout(window['__scriptLoaded_tid']);
				checkDone();
			}, 4);
		};
		
		checkDone();
	},
	
	// 获取当前加载的js的url路径
	_selfPath = (function(scripts) {
		return scripts[scripts.length-1].src;
	})(doc.getElementsByTagName('script'));
	
	
	// 开启IE6 CSS背景图片缓存，避免背景图片闪烁
	 try {
   		doc.execCommand("BackgroundImageCache", false, true);
   } catch(e) {}
	
     
	//-----------------------------------------------------------------------------------
	//	对话框模块， 核心类 Dialog
	//-----------------------------------------------------------------------------------
	var Dialog = function(config) {

		var cfg = config || {}, dlg = null;
		
		// 合并配置项
		for(var p in Dialog.defaults) {
			if(!cfg.hasOwnProperty(p)) {
				cfg[p] = Dialog.defaults[p];
			}
		}
		
		cfg.id = cfg.id || 'idlg'+ (+new Date());
		
		for(var i = 0, len = _topWin['__dialog_list'].length; i < len; i++) {
			if(_topWin['__dialog_list'][i].id === cfg.id) {
				dlg = _topWin['__dialog_list'][i];
			}
		}

		if(dlg) {
			dlg._focus();
			return dlg;
		}
		
		var _follow = cfg.follow || {'target': null};
		if(typeof _follow === 'string' || _follow.tagName) {
			_follow = {'target': _follow.tagName ? _follow : document.getElementById(_follow), 
						'placement':'bottom'
					};
		} 
		else if(typeof _follow === 'object' && _follow['target']) {
			_follow = {'target': typeof _follow['target'] === 'string' 
									? document.getElementById(_follow['target'])
									: _follow['target'],
						'placement': _follow['placement']	
					 };
		}
		
		if(_follow && _follow['target']) {
			cfg.follow = _follow;
			cfg.context = window;
			cfg.fixed = false;
		}

		// 指定了Dialog显示的容器
		if(cfg.container) {
			cfg.container = typeof cfg.container === 'string' 
												? document.getElementById(cfg.container) 
												: cfg.container;
			if(!cfg.container.tagName) {
				throw new Error('Dialog `container` must be Html Element object!');
			}

			cfg.context = cfg.container.ownerDocument.defaultView 
										|| cfg.container.ownerDocument.parentWindow;

			cfg.fixed = false;

			if('BODY' !== cfg.container.tagName) {
				cfg.modal = false;
			}
		}
		
		cfg.context = cfg.context || _topWin;
		_isIE6 && (cfg.fixed = false);
		
		return new Dialog.fn.constructor(cfg);
	};
	
	Dialog.fn = Dialog.prototype = {
		
		version: "4.0.1",
		
		// ------------------------ private method -----------------------------
		constructor: function(config) {
			this.config 		= config;
			this.id 			= config.id;
			this.context 		= config.context;
			this.openerWindow  	= null;
			this.openerDialog  	= null;
			this.innerWindow   	= null;
			this.innerDocument 	= null;
			
			this._contextDoc 	= config.context.document;
			this._container = config.container || this._contextDoc.body;
			this._zindex 		= 9999 || config.zindex;
			this._childList 	= []; // 存放子窗口
			this._unauthorized 	= false;
			this._maximized 	= false;
			this._closed 		= false;
			
			this.DOM = this.DOM || this._getDOM();
			this.htmlElement 	= this.DOM.wrap;
			
			var dom = this.DOM, _theme = '';
			
			// 通过 dialog.js?theme= 传递的主题样式
			if(_queryParam(_selfPath, 'theme')) {
				_theme += (' ' + _queryParam(_selfPath, 'theme'));
			}
			// 通过Dialog.open({"theme":""}) 传递的主题
			if(typeof(config.theme) == 'string') {
				_theme += (' ' + config.theme);
			}
				
			if(_theme != '') {
				dom.outer.className += _theme;
			}
			
			if(!config.closeable) {
				dom.close.style.display = 'none';
			}
			
			if(!config.maxable) {
				dom.max.style.display = 'none';
			}
			
			if(!config.minable) {
				dom.min.style.display = 'none';
			}
			
			// 设置标题
			this.title(config.title);
			
			// 创建自定义按钮
			this.button.apply(this, config.button);
			
			// 计算 content 区域周边的位置坐标
			var _area = dom.main,
				wrapOffset = _offset(dom.wrap),
				mainOffset = _offset(dom.main);
			
			this._mainAreaRect = {
				"offset":[mainOffset.top - wrapOffset.top,
							dom.wrap.offsetWidth - dom.main.offsetWidth - (mainOffset.left - wrapOffset.left),
							dom.wrap.offsetHeight - dom.main.offsetHeight - (mainOffset.top - wrapOffset.top),
							mainOffset.left - wrapOffset.left],
							
				"border":[_int(_css.get(_area, 'borderTopWidth'), 0),
							_int(_css.get(_area, 'borderRightWidth'), 0),
							_int(_css.get(_area, 'borderBottomWidth'), 0),
							_int(_css.get(_area, 'borderLeftWidth'), 0)],
							
				"padding":[_int(_css.get(_area, 'paddingTop'), 0),
							_int(_css.get(_area, 'paddingRight'), 0),
							_int(_css.get(_area, 'paddingBottom'), 0),
							_int(_css.get(_area, 'paddingLeft'), 0)]
			};
			
			if(config.url && typeof config.url === 'string') {
				this._iframe().src = config.url;
			} 
			else if(config.content) {
				this.content(config.content);
			}
			
			this.size(config.width, config.height).resetPosition();
	
			config.modal && this._lock();
			
			_isFunc(config.onShow) && config.onShow.call(this);
			
			// 置顶窗口
			this._focus();
			this._addEvent();

			this.openerWindow = window;
			window.ownerDialog && (this.openerDialog = window.ownerDialog);
			
			// 在窗口管理器中注册新的窗口对象
			_topWin['__dialog_list'].unshift(this);
			
			// 如果当前窗口是从另外一个Dialog窗口内部弹出来，则作为父Dialog的子窗口
			if(this.openerDialog) {
				this.openerDialog._childList.unshift(this);
			}
		},

		_getDOM: function() {
			var cfg = this.config, dom = {},
				//$body = this._contextDoc.body,
				$body = this._container,
				$wrap = this._contextDoc.createElement("div");
			
			$wrap.style.cssText = "position:"+ (cfg.fixed ? "fixed" : "absolute") 
									+";left:0;top:0;padding:0 !important;margin:0 !important;border:0 !important;";
			$wrap.className = "fui-dialog";
			//$body.insertBefore($wrap, $body.firstChild);
			$body.appendChild($wrap);
			
			$wrap.innerHTML = Dialog._tmpl.replace('{rs_tmpl}', cfg.resizable ? Dialog.rs_tmpl : '');
			
			var eles = $wrap.getElementsByTagName('*'), _class;
			for(var i = 0, len = eles.length; i < len; i++) {
				_class = eles[i].className;
				if(!_class || _class.indexOf('idlg-') === -1) {
					continue;
				}

				dom[_class.split('-')[1]] = eles[i];
			}
			
			dom.wrap = $wrap;
			return dom;
		},
		
		_iframe: function() {
			var dom = this.DOM,
				$content = dom.main,
				$iframe = dom.iframe;
				
			if($iframe) {
				return $iframe;
			}
			
			_innerHTML($content, Dialog.ifrm_tmpl, this.context);
			
			$iframe = dom.iframe = $content.getElementsByTagName('iframe')[0];
			dom.iframeCover = $content.getElementsByTagName('div')[0];

			var _iframeLoad = this.iframeLoad = (function(diag) { 
		   		return function(evt) {
			   	   var frm = evt.srcElement || evt.target;
		           try {
		           		frm.contentWindow["ownerDialog"] = diag;
		           		diag.innerWindow = frm.contentWindow;
			            diag.innerDocument = frm.contentWindow.document;
						
						// 自适应高度
						if(diag.config.height == 'auto'){
							var pbody = diag.innerDocument.getElementsByTagName('body')[0],
								ch = Math.max(pbody.clientHeight, pbody.offsetHeight);
								ch = ch == 0 ? pbody.scrollHeight : ch;
							var _rect = diag._mainAreaRect;
							// 总高度 = 内页高度 + 外围
							diag.config.height = ch + _rect.offset[0] + _rect.offset[2]
													+ _rect.border[0] + _rect.border[2] 
													+ _rect.padding[0] + _rect.padding[2];
													
							diag.size(diag.config.width, diag.config.height).resetPosition();
						}
						
		           } catch(e) {
		              	diag._unauthorized = true;
		           }
		           
		           _isFunc(diag.config.onLoad) && diag.config.onLoad.call(diag);

		           frm = null;
			   };
			   
			})(this);
			
			_EventHandler.bind($iframe, 'load', _iframeLoad);
			
			return $iframe;
		},

		// 聚焦当前窗口
		_focus: function() {
			var dom = this.DOM,
				$mask = this._mask(),
				focusDiag = _topWin._focusDialog,
				openerDiag = this.openerDialog,
				zindx = 0;
			
			if(this._childList.length == 0 && this !== focusDiag) {
				zindx = _topWin._dialogzIndex;
				dom.wrap.style.zIndex = zindx;
				this.config.modal && ($mask.style.zIndex = zindx - 1);
				_topWin._dialogzIndex += 2;
			}
			
			this.show();
			
			if(focusDiag && this !== focusDiag) {
				_css.remove(focusDiag.DOM.wrap, 'idlg-focus');
				_css.add(focusDiag.DOM.wrap, 'idlg-blur');
				focusDiag.DOM.iframeCover && (focusDiag.DOM.iframeCover.style.display = 'block');
			}

			if(dom.iframeCover) {
				dom.iframeCover.style.display = 'none';
			}

			if(openerDiag && openerDiag.DOM.iframeCover) {
				openerDiag.DOM.iframeCover.style.display = 'none';
			}

			_css.remove(dom.wrap, 'idlg-blur');
			_css.add(dom.wrap, 'idlg-focus');

			_topWin._focusDialog = this;
		},
		
		// 锁屏
		_lock: function() {
			this._mask().style.display = 'block';
		},
		
		// 创建遮罩层
		_mask: function() {
			var _doc = this._contextDoc, 
				$mask = _doc.getElementById('_idlg_mask_');
				
			if($mask) {
				return $mask;
			}
			
			$mask = _doc.createElement('div');
			$mask.id = '_idlg_mask_';
			$mask.style.cssText = "position:"+(_isIE6?"absolute":"fixed")+";left:0px;top:0px;right:0px;bottom:0px;z-index:1;width:100%;height:100%;";
			$mask.className = 'idlg-mask';
			
			if(_isIE6) {
				$mask.style.width = _winSize(this.context).sw + 'px';
				$mask.style.height = _winSize(this.context).sh + 'px';
			}
			
			_doc.body.appendChild($mask);

			$mask.onclick = function() {
				if(_topWin._focusDialog 
					&& _topWin._focusDialog.config.quickClose === true) {
					_topWin._focusDialog.close();
				}
			};
			
			return $mask;
		},
		
		// 初始化窗口相关事件
		_addEvent: function() {
			var _this = this, 
				cfg = this.config,
				dom = this.DOM, 
				$wrap = dom.wrap, 
				_clickHandler,
				_mdownHandler;
			
			this._eventCache = this._eventCache || [];
			
			_clickHandler = _EventHandler.add($wrap, 'click', function(evt) {
				var target = evt.srcElement || evt.target;
				
				if(target.disabled) {
					return;
				}
				
				// close
				if(target === dom.close) {
					return !_isFunc(cfg.closeEvent) || cfg.closeEvent.call(_this) !== false 
							? _this.close() : _this;
				}
				// max
				else if(target === dom.max) {
					_this.maximize();
				}
				// min
				else if(target === dom.min) {
					_this.minimize();
				} 
				// dialog buttons
				else if(_css.has(target, 'idlg-btn')) {
					var fn = _this._listeners[target.id] && _this._listeners[target.id].callback;
					return (typeof fn !== 'function' || fn.call(_this) !== false) 
								? _this.close() : _this;
				}
			});
			
			_mdownHandler = _EventHandler.add($wrap, 'mousedown', function(evt) {
				_this._focus();	
			});
			
			this._eventCache.push(_clickHandler);
			this._eventCache.push(_mdownHandler);
		},
		
		// 清除窗口上注册的所有事件
		_removeEvent: function() {
			var _eventCache = this._eventCache;
			if(_eventCache && _eventCache.length > 0) {
				for(var i = _eventCache.length - 1; i >= 0 ; i--) {
					_EventHandler.remove(_eventCache[i]);
				}
				
				this._eventCache = _eventCache = [];
			}
			
			if(this.DOM.iframe) {
				_EventHandler.unbind(this.DOM.iframe, 'load', this.iframeLoad);
			}
		},
		
		// ------------------------ public method -----------------------------
		
		/**
		 * 设置或获取Dialog标题内容
		 * @param _title 新标题内容，可选
		 * @return 如果无参数，则返回Dialog标题内容；如果有参数，则返回当前Dialog对象本身
		 */
		title: function(_title) {
			var $title = this.DOM.title;
			
			if(_title === undefined) {
				return $title.innerHTML;
			}
			
			if(_title === false || _title === null) {
				$title.parentNode.style.display = "none";
				return this;
			}
			
			if(typeof _title === 'string') {
				$title.parentNode.style.display = 'block';
				_innerHTML($title, _title, this.context);
				return this;
			} 
			
			if(_isFunc(_title)) {
				// 支持异步更新标题
				var asyncTitle = _title.call(this, (function(diag){ 
												return function(newTitle){
													diag.title(newTitle);
											 	};
									 		})(this));
				
				if(asyncTitle && typeof asyncTitle === 'string') {
					this.title(asyncTitle);
				};
			}
			return this;
		},
		
		/**
		 * 设置或获取Dialog显示的url地址
		 * @param _url {String}，可选
		 * @return 如果无参数，则返回当前的url地址；否则，加载给定的url。
		 */
		url: function(_url) {
			if(_url === undefined) {
				return this.config.url;
			}
			
			this.DOM.iframe && (this.DOM.iframe.src = _url);
			
			return this;
		},
		
		/**
		 * 设置或获取Dialog显示的内容
		 * @param _content {String, HTMLElement, Function}，可选
		 * @return 如果无参数且内容是url加载生成的，则返回url对应页面的window对象(非跨域下)；
		 * 		如果无参数且内容是静态内容，则返回静态内容本身；
		 * 		如果有参数，则返回当前Dialog对象本身
		 */
		content: function(_content) {
			if(_content === undefined) {
				if(this.config.url) {
					return this.innerWindow;
				}
				
				return this.config.content;
			}
			
			var _this = this, prev, next, pNode, display, asyncContent, 
				$content = this.DOM.main;
			
			if(this._elemBack) {
				this._elemBack();
				delete this._elemBack;
			}

			if(typeof _content === 'string') {
				_innerHTML($content, _content, this.context);
			} 
			else if(_isFunc(_content)) {
				// 支持异步更新内容
				asyncContent = _content.call(this, (function(diag){ 
													return function(newStr){
														diag.content(newStr);
												 	};
									 			})(this)
									 	);
				
				if(asyncContent && typeof asyncContent === 'string') {
					_innerHTML($content, asyncContent, this.context);
				};
			}
			// HTMLElement
			else if(_content && _content.nodeType === 1) {
				// 让传入的元素在窗口关闭后可以恢复到原来的地方
				display = _content.style.display;
				prev = _content.previousSibling;
				next = _content.nextSibling;
				pNode = _content.parentNode;
				
				this._elemBack = function() {
					if(prev && prev.parentNode) {
						prev.parentNode.insertBefore(_content, prev.nextSibling);
					} else if(next && next.parentNode) {
						next.parentNode.insertBefore(_content, next);
					} else if(pNode) {
						pNode.appendChild(_content);
					}
					_content.style.display = display;
					_this.elemBack = null;
				};
				
				$content.innerHTML = '';
				//$content.appendChild(_content);
				_innerHTML($content, _content.outerHTML, this.context);
				_content.style.display = "block";
			}
			
			this.resetPosition();
			
			return this;
		},
		
		/**
		 * 改变Dialog窗口大小
		 * @param w 窗口宽度
		 * @param h 窗口高度
		 * @return 当前Dialog对象本身
		 */
		size: function(w, h) {
			var dom = this.DOM, iw = 'auto', ih = 'auto';
			
			var _rect = this._mainAreaRect,
				ws = _winSize(this.context);
			
			// 计算内容区域的宽度和高度
			if(!isNaN(w)) {
				w = Math.min(_int(w, 0), ws.cw);
				iw = w - _rect.offset[1] - _rect.offset[3];
				dom.wrap.style.width = w + 'px';
			}

			if(!isNaN(h)) {
				h = Math.min(_int(h, 0), ws.ch);
				ih = h - _rect.offset[0] - _rect.offset[2];
			}
			
			// 真正的宽度和高度要去除可能配置的border和padding差值
			if(!isNaN(iw)) {
				iw = iw - (_rect.border[1] + _rect.border[3] + _rect.padding[1] + _rect.padding[3]) + 'px';
			}

			if(!isNaN(ih)) {
				ih = ih - (_rect.border[0] + _rect.border[2] + _rect.padding[0] + _rect.padding[2]) + 'px';
			}
			
			dom.main.style.width = iw;
			dom.main.style.height = ih;
			
			if(dom.iframe) {
				dom.iframe.style.width = iw;
				dom.iframe.style.height = ih;
			}
			
			this.config.width = w;
			this.config.height = h;
			
			return this;
		},
		
		/**
		 * 窗口显示位置
		 */
		position: function(_left, _top) {
			var reg = /^\d+(\.\d+)?%$/,
				cfg = this.config,
				$wrap = this.DOM.wrap,
				_fixed = cfg.fixed,
				ws = _winSize(this.context),
				dl = _fixed ? 0 : ws.sl,
				dt = _fixed ? 0 : ws.st;
			
			_left = _left === undefined ? cfg.left : _left;
			_top = _top === undefined ? cfg.top : _top;
			
			cfg.left = _left;
			cfg.top = _top;
			
			if (reg.test(_left)) {
	      _left = (ws.cw - $wrap.offsetWidth) * parseFloat(_left) * 0.01 + dl;
				_left = Math.max(parseInt(_left), dl);
	    }
		
	    if(reg.test(_top)) {
				_top = (ws.ch - $wrap.offsetHeight) * parseFloat(_top) * 0.01 + dt;
				_top = Math.max(parseInt(_top), dt);
	    }

	    $wrap.style.left = _left + 'px';
	    $wrap.style.top = _top + 'px';
			
			return this;
		},
		
		/**
		 * 重新调整当前窗口的显示位置
		 */
		resetPosition: function () {
			var _follow = this.config.follow || this._follow;
			_follow && _follow['target'] ? this.follow(_follow['target'], _follow['placement']) : this.position();
		},
		
		/**
		 * 显示当前Dialog窗口
		 * 和 hide() 方法配合使用
		 */
		show: function() {
			this.DOM.wrap.style.display = "block";
			_css.add(this.DOM.wrap, 'idlg-show');
			return this;
		},
		
		/**
		 * 隐藏当前Dialog窗口
		 * 和 close() 区别是：hide() 是暂时不显示
		 */
		hide: function() {
			this.DOM.wrap.style.display = "none";
			return this;
		},
		
		/**
		 * 跟随元素
		 * @param {HTMLElement}, placement = top|bottom|left|right
		 */
		follow: function (elem, placement) {
			// 隐藏元素不可用
			if (!elem || !elem.offsetWidth && !elem.offsetHeight) {
				return this.position();
			};
			
			this.config.dragable = false;
			this.config.resizable = false;
			
			placement = (/^\s*(top|bottom|left|right)\s*$/gi.test(placement) ? placement : 'bottom').toLowerCase();

			var fixed = false,
				dom = this.DOM,
				ws = _winSize(this.context),
				winWidth = ws.cw,
				winHeight = ws.ch,
				docLeft =  ws.sl,
				docTop = ws.st,
				
				offset = _offset(elem),
				elemWidth = elem.offsetWidth,
				elemHeight = elem.offsetHeight,
				
				left = fixed ? offset.left - docLeft : offset.left,
				top = fixed ? offset.top - docTop : offset.top,
				
				wrapWidth = dom.wrap.offsetWidth,
				wrapHeight = dom.wrap.offsetHeight,
				
				setLeft = 0,
				setTop = 0,
				
				dl = fixed ? 0 : docLeft,
				dt = fixed ? 0 : docTop;
			
			dom.arrow.style.display = 'block';
			var arrLeft = 10, arrTop = 10, 
				arrType = '';
			
			if('left' == placement || 'right' == placement) {
				dom.arrow.className = 'idlg-arrow at-lft';
				var arrW = dom.arrow.offsetWidth, arrH = dom.arrow.offsetHeight;
				var _lft = left + dl - (wrapWidth + arrW), 
						_rgt = (left + elemWidth) + arrW;
					
				setTop = Math.max(dt, top + elemHeight/2 - wrapHeight/2);
				if(setTop + wrapHeight > winHeight + dt) {
					setTop = winHeight + dt - wrapHeight;
				}
				arrTop = top + elemHeight/2 - setTop;
				//修正arrTop的值，不能超出当前Dialog的范围
				if(arrTop <= arrH * 0.5) { arrTop = arrH * 0.5 + 4; }
				if(arrTop + arrH >= wrapHeight) { arrTop = wrapHeight - arrH - 4; }
					
				switch(placement) {
					case 'left':
						setLeft = _lft;
						arrType = 'rgt';
						if(_rgt + wrapWidth <= winWidth) {
							setLeft = _rgt;
							arrType = 'lft';
						}
					break;
					case 'right':
						setLeft = _rgt;
						arrType = 'lft';
						if(_rgt + wrapWidth > winWidth && _lft >= 0) {
							setLeft = _lft;
							arrType = 'rgt';
						}
					break;
				};
				
				dom.arrow.className = 'idlg-arrow at-'+ arrType;
				dom.arrow.style.top = parseInt(arrTop - arrH * 0.5) + 'px';
			} else {
				dom.arrow.className = 'idlg-arrow at-top';
				var arrW = dom.arrow.offsetWidth, arrH = dom.arrow.offsetHeight;
				setLeft = left - (wrapWidth - elemWidth) * 0.5;
				if(setLeft < dl) {
					setLeft = left;
					arrLeft = elemWidth * 0.5;
				} else if((setLeft + wrapWidth > winWidth) && (left - wrapWidth > dl)) {
					setLeft = left + elemWidth - wrapWidth;	
					arrLeft = wrapWidth - elemWidth * 0.5;
				} else {
					setLeft = setLeft;
					arrLeft = wrapWidth * 0.5;
				}
				//修正 arrLeft 的值，不能超出当前Dialog的范围
				if(arrLeft <= arrW * 0.5) { arrLeft = arrW * 0.5 + 4; }
				if(arrLeft + arrW >= wrapWidth) { arrLeft = wrapWidth - arrW - 4; }
				
				switch(placement) {
					case 'top':
						setTop = top - wrapHeight - arrH;
						arrType = 'btm';
						if(setTop - dt < 0) {
							setTop = top + elemHeight + arrH;
							arrType = 'top';
						}
					break;
					case 'bottom':
						setTop = top + elemHeight + arrH;
						arrType = 'top';
						if((setTop + wrapHeight > winHeight + dt) && (top - wrapHeight > dt)) {
							setTop = top - wrapHeight - arrH;
							arrType = 'btm';
						}
					break;
				};
				
				dom.arrow.className = 'idlg-arrow at-'+ arrType;
				dom.arrow.style.left = parseInt(arrLeft - arrW * 0.5) + 'px';
			}		

			dom.wrap.style.position = 'absolute';
			dom.wrap.style.left = parseInt(setLeft) + 'px';
			dom.wrap.style.top = parseInt(setTop) + 'px';
			
			this._follow = {'target': elem, 'placement': placement};
		
			return this;
		},
		
		/**
		 * 创建按钮
		 * @example button({
				id:'',
				label: 'login',
				callback: function () {},
				disabled: false,
				focus: true
				}, .., ..)
		 */
		button: function() {
			var args = [].slice.call(arguments);
		
			if(args.length == 0) {
				return;
			}
			
			var doc = this._contextDoc,
				dom = this.DOM,
				listeners = this._listeners = this._listeners || {},
				i = 0, len = args.length, arg, id, isNewBtn, btn;	
			
			for(; i < len; i++) {
				arg = args[i];
				id = arg.id || 'idlg_btn_'+ (+ new Date()) + '_' + i;
				isNewBtn = !listeners[id];
		
				btn = !isNewBtn ? listeners[id].elem : doc.createElement('a');
				btn.setAttribute('href', 'javascript:;');
				btn.id = id;
				btn.className = 'idlg-btn'+ (arg.focus ? ' state-focus' : '');
				btn.innerHTML = arg.label;
				btn.disabled = !!arg.disabled;
				
				if(btn.disabled) {
					btn.className += ' idlg-btn-dis';
				}
				
				if(!listeners[id]) {
					listeners[id] = {};
				}
				
				if(arg.callback) {
					listeners[id].callback = arg.callback;
				}
				
				if(isNewBtn) {
					listeners[id].elem = btn;
					dom.buttons.appendChild(btn);
				}
			}
			
			dom.footer.style.display = 'block';
			
			return this;
		},
		
		/**
		 * 关闭当前Dialog窗口对象
		 */
		close: function() {
			
			if(this._closed) {
				return;
			}
			
			// 从窗口管理器中移除当前窗口对象
			removeDiag(_topWin['__dialog_list'], this);
			
			var cfg = this.config, 
				hideMask = true, 
				$mask = this._mask(), 
				leftDiags = _topWin['__dialog_list'],
				$wrap = null;
			
		    /*if(this._unauthorized === false) {
			  	if(this.innerWindow && this.innerWindow.Dialog && 
			  			this.innerWindow.Dialog._childList.length > 0) {
			  		return;
			  	}
			}*/

			// 先关闭可能存在的所有子窗口
			for(var i = 0, len = this._childList.length; i < len; i++) {
				this._childList.shift().close();
			}
			
			// 如果定义了窗口关闭后要执行的事件
	    if(_isFunc(cfg.onClosed)) {
	    	cfg.onClosed.call(this);
	    }
		
			// 将遮罩层交给后面一个需要的窗口
			for(var i = 0, len = leftDiags.length; i < len; i++) {
				if(leftDiags[i].config.modal) {
					$mask.style.zIndex = _int(leftDiags[i].DOM.wrap.style.zIndex, 1) - 1;
					hideMask = false;
					break;
				}
			}
			// 如果没有dialog需要mask的，则隐藏mask
		  hideMask && ($mask.style.display = 'none');
			
			// 将窗口管理中下一个窗口激活为当前顶层窗口
			_topWin._focusDialog = leftDiags.length > 0 ? leftDiags[0] : null;
			_topWin._focusDialog && _topWin._focusDialog._focus();

			this._closed = true;
		    
			$wrap = this.DOM.wrap;
			$wrap.style.display = 'none';
			
			this._removeEvent();
			
			if(this._elemBack) {
			   this._elemBack();
			}
			
			if(this._listeners) {
				for(var j in this._listeners) {
					this._listeners[j] = null;
					delete this._listeners[j];
				}
				this._listeners = null;
			}
			
			/*if(cfg.url) {
				this.DOM.iframe.src = 'about:blank';
				this.DOM.iframe.parentNode.innerHTML = '&nbsp;';
			}*/
			
			for(var d in this.DOM){
				this.DOM[d] = null;
				delete this.DOM[d];
			}
			
			this.DOM = null;
			this.context = null;
			this.openerWindow  = null;
			this.openerDialog  = null;
			this.innerWindow   = null;
			this.innerDocument = null;
			this._contextDoc = null;
			this._container = null;
			this._childList = [];
			this.htmlElement = null;

			$wrap.parentNode.removeChild($wrap);
			
			cfg = hideMask = $mask = leftDiags = $wrap = null;
			
			// IE下强制执行垃圾回收
		  doc.all && CollectGarbage();
		},
		
		/**
		 * 最大化窗口
		 */
		maximize: function() {
			if(!this.config.maxable) {
				return this;
			}
			
			if(_isFunc(this.config.maximizeEvent) 
				&& this.config.maximizeEvent.call(this) === false) {
				return this;
			}
			
			var cfg = this.config, 
				$wrap = this.DOM.wrap;
			// 还原窗口
			if(this._maximized === true) {
				this._maximized = false;
				this.size(this._ow, this._oh).position();
				this.DOM.max.className = 'idlg-max';
				_css.remove(this.DOM.wrap, 'idlg-maximized');
			} else {
				this._maximized = true;
				this._ow = cfg.width;
				this._oh = cfg.height;
				$wrap.style.left = '0px';
				$wrap.style.top = '0px';
				this.size(99999, 99999);
				this.DOM.max.className = 'idlg-max idlg-restore';
				_css.add(this.DOM.wrap, 'idlg-maximized');
			}
			
			return this;
		},
		
		/**
		 * 最小化窗口
		 */
		minimize: function() {			
			if(!this.config.minable) {
				return this;
			}
			
			if(_isFunc(this.config.minimizeEvent)
				&& this.config.minimizeEvent.call(this) === false) {
				return this;
			}
			
			var dom = this.DOM;
			if(this._minimized === true) {
				this._minimized = false;
				dom.main.style.display = 'block';
				dom.footer.style.display = 'block';
				_css.remove(this.DOM.wrap, 'idlg-minimized');
			} else {
				this._minimized = true;
				dom.main.style.display = 'none';
				dom.footer.style.display = 'none';
				_css.add(this.DOM.wrap, 'idlg-minimized');
			}

			return this;
		}
		
	};
	
	
	Dialog.fn.constructor.prototype = Dialog.fn;
	
	_topWin['__dialog_list'] = _topWin['__dialog_list'] || [];
	_topWin._focusDialog = _topWin._focusDialog || null;
	_topWin._dialogzIndex = _topWin._dialogzIndex || 9999;
	
	function removeDiag(arr, diag) {
		for(var i = 0, len = arr.length; i < len; i++) {
			if( diag == arr[i] ){
				arr[i] = null;
				arr.splice(i, 1);
				break;
			}
		}
	}

	//----------------------------------------------------------------------------
	// Dialog对话框 拖曳(drag, resize)支持 (可选外部模块)
	//----------------------------------------------------------------------------
	var _dragEvent = null, _dragInit = null, 
		_isLosecapture = 'onlosecapture' in doc.documentElement,
		_isSetCapture = 'setCapture' in doc.documentElement;
	
	Dialog.dragEvent = function() {
		var that = this,
			proxy = function(name) {
				var fn = that[name];
				that[name] = function() {
					return fn.apply(that, arguments);
				};
			};
		
		proxy('start');
		proxy('move');
		proxy('end');
	};
	
	Dialog.dragEvent.prototype = {
		onstart: function(){},
		start: function(evt) {
			this._sClientX = evt.pageX;
			this._sClientY = evt.pageY;
			_EventHandler.bind(doc, 'mousemove', this.move);
			_EventHandler.bind(doc, 'mouseup', this.end);
			this.onstart(this._sClientX, this._sClientY);
			return false;
		},
		
		onmove: function(){},
		move: function(evt) {
			evt = _EventHandler.fix(evt);
			this.onmove(evt.pageX - this._sClientX, evt.pageY - this._sClientY);
			return false;
		},
		
		onend: function(){},
		end: function(evt) {
			evt = _EventHandler.fix(evt);
			_EventHandler.unbind(doc, 'mousemove', this.move);
			_EventHandler.unbind(doc, 'mouseup', this.end);
			this.onend(evt.pageX, evt.pageY);
			return false;
		}
	};
	
	// Dialog drag init
	_dragInit = function(evt) {
		var diag = window._focusDialog,
			dom = diag.DOM,
			$wrap = dom.wrap,
			wrapStyle = $wrap.style,
			$title = dom.title,
			$cover = dom.iframeCover,
			target = evt.srcElement || evt.target, 
			targetCls = target.className;
		
		var _isResize = (targetCls && /(\s+|^)idlg-(s|n|w|e|nw|ne|sw|se)(\s+|$)/.test(targetCls));
		var startWidth = 0, startHeight = 0, startLeft = 0, startTop = 0, limit = {};
		
		_dragEvent.onstart = function(x, y) {
			if(_isResize) {
				startWidth = $wrap.offsetWidth;
				startHeight = $wrap.offsetHeight;
			}
			
			startLeft = _int(wrapStyle.left, 0);
			startTop = _int(wrapStyle.top, 0);
			
			!_isIE6 && _isLosecapture ? _EventHandler.bind($title, 'losecapture', _dragEvent.end) 
									 : _EventHandler.bind(window, 'blur', _dragEvent.end);
			
			_isSetCapture && $title.setCapture();
			
			$cover && ($cover.style.display = 'block');
		};
		
		_dragEvent.onmove = function(x, y) {
			if(_isResize) {
				var pos = {"width": startWidth, "height": startHeight, 
							"left": _int(wrapStyle.left, 0), "top": _int(wrapStyle.top, 0)};

				if(targetCls.indexOf("e") != -1) {
					pos.width = Math.max(Dialog.defaults._resize.minWidth, startWidth + x);
				}
				if(targetCls.indexOf("s") != -1) {
					pos.height = Math.max(Dialog.defaults._resize.minHeight, startHeight + y);
				}
				if(targetCls.indexOf("w") != -1) {
					pos.width = Math.max(Dialog.defaults._resize.minWidth, startWidth - x);
					pos.left = Math.max(0, startLeft + startWidth - pos.width);
				}	
				if(targetCls.indexOf("n") != -1) {
					pos.height = Math.max(Dialog.defaults._resize.minHeight, startHeight - y);
					pos.top = Math.max(0, startTop + startHeight - pos.height);
				}
				
				wrapStyle.left = pos.left +'px';
				wrapStyle.top = pos.top +'px';
				
				diag.size(pos.width, pos.height);
				
				if(_isFunc(diag.config.onResize)) {
					diag.config.onResize.call(this, pos);
				}
				
			} else {
				var	nLeft = Math.max(limit.minX, Math.min(limit.maxX, x + startLeft)),
					nTop = Math.max(limit.minY, Math.min(limit.maxY, y + startTop));
				
				wrapStyle.left = nLeft + 'px';
				wrapStyle.top = nTop + 'px';
				
				if(_isFunc(diag.config.onDrag)) {
					diag.config.onDrag.call(this, {'left': nLeft, 'top': nTop});
				}
			}
		};
		
		_dragEvent.onend = function(x, y) {
			diag.config.left = _int(wrapStyle.left, 0);
			diag.config.top = _int(wrapStyle.top, 0);
			$cover && ($cover.style.display = 'none');
			
			!_isIE6 && _isLosecapture 
					? _EventHandler.unbind($title, 'losecapture', _dragEvent.end)
					: _EventHandler.unbind(window, 'blur', _dragEvent.end);
					
			_isSetCapture && $title.releaseCapture();
		};
		
		limit = (function() {
			var ws = _winSize(diag.context),
				maxX = 0, maxY = 0,
				fixed = ($wrap.style.position === 'fixed'),
				ow = $wrap.offsetWidth,
				oh = $wrap.offsetHeight,
				ww = ws.cw,
				wh = ws.ch,
				dl = fixed ? 0 : ws.sl,
				dt = fixed ? 0 : ws.st;
			
			// 坐标最大限制
			maxX = ww - ow + dl;
			maxY = wh - oh + dt;
			
			return {
				"minX": dl,
				"minY": dt,
				"maxX": maxX,
				"maxY": maxY,
				"sl": ws.scrollLeft,
				"st": ws.scrollTop
			};
		})();
		
		_dragEvent.start(evt);
	};
	
	function _dragHandler(evt) {
		var diag = window._focusDialog;
		if(!diag) {
			return false;
		}
		
		if(!diag.config.dragable && !diag.config.resizable || diag._maximized) {
			return false;
		}
		
		var _evt = _EventHandler.fix(evt), target = _evt.target;
		
		while(target) {
			if(target.className && /(\s+|^)idlg-(header|s|n|w|e|nw|ne|sw|se)(\s+|$)/.test(target.className)) {
				break;
			}
			if(target === diag.DOM.wrap || (target.nodeType === 1 && target.tagName === 'BODY')) {
				target = null;
				break;
			}
			target = target.parentNode;
		};
		
		if(target) {
			_dragEvent = _dragEvent || new Dialog.dragEvent();
			_dragInit(_evt);
			_EventHandler.stop(evt);
			// 防止firefox与chrome滚屏
			return false; 
		};
	};
	
	// 代理 mousedown 事件触发对话框拖动
	_EventHandler.bind(document, 'mousedown', _dragHandler);
	
	//---------------------------------- drag end -------------------------------
	
	
	//------------------------------------------------------------
	// 静态方法
	//------------------------------------------------------------
	
	/**
	 * 打开一个新窗口
	 * @return 返回新打开的窗口对象
	 */
	Dialog.open = function(config) {
		var dlg = Dialog(config);
		return dlg;
	};
	
	/**
	 * 根据窗口唯一标识ID获取窗口Dialog对象
	 * @param id 窗口唯一标识ID
	 * @return 如果id为空，则返回当前活动的窗口Dialog对象；否则返回指定ID的窗口Dialog对象
	 */
	Dialog.get = function(id, win) {
		if(id === undefined) {
			return _topWin._focusDialog;
		}
		
		for(var i = 0, len = _topWin['__dialog_list'].length; i < len; i++) {
			if(_topWin['__dialog_list'][i].id === id) {
				return _topWin['__dialog_list'][i];
			}
		}
		
		return null;
	};	
	
	/**
	 * 用于窗口内子页面获取当前所在窗口的触发来源页面window对象
	 * 即：当前窗口是从哪个页面上弹出来的
	 * @return 触发页面的window对象
	 */
	Dialog.openerWindow = function() {
		if(window.ownerDialog) {
			return window.ownerDialog.openerWindow;
		} else {
			return null;
		}
	};
	
	/**
	 * 用于窗口内子页面获取当前所在窗口的父窗口Dialog对象
	 * 即：当前窗口是从哪个Dialog窗口中弹出来的
	 * @return 触发窗口的Dialog对象
	 */
	Dialog.openerDialog = function() {
		var op_win = Dialog.openerWindow();
		if( op_win && op_win.ownerDialog ){
			return op_win.ownerDialog;
		}else{
			return null;
		};
	};
	
	/**
	 * 用于窗口内子页面获取当前所在窗口Dialog对象
	 * @return 当前所在窗口的Dialog对象
	 */
	Dialog.ownerDialog = function() {
		if(window.ownerDialog) {
			return window.ownerDialog;
		} else {
			return null;
		}
	};
	
	/**
	 * 关闭窗口
	 * @param id 窗口唯一标识ID，如果参数为空，则关闭当前活动的窗口；否则关闭ID指定的窗口
	 */
	Dialog.close = function(id, win) {
		if(id === undefined) {
			window.ownerDialog.close();
		} 
		else if(Dialog.get(id, win)){
			Dialog.get(id, win).close();
		}
	};
	
	/** 
	 * alert 提示框
	 * @param content 提示内容，支持html元素
	 * @param okFunc 点击“确定”后执行的回调函数，可选
	 * @param config  提示框的特性设定，支持：title, width, dragable, yesLabel, type(info, warning, success, error)
	 */
	Dialog.alert = function(content, okFunc, config) {
		var cfg = config || {};
		var icon_type = 'icon-'+ (cfg.type || 'info'),
			btns = [{label: cfg.yesLabel || Dialog.defaults.alert.yesLabel, focus: true, callback: okFunc}];
		
		cfg.title =  '<i class="alert-icon '+ icon_type +'">&nbsp;</i>'+ (cfg.title || Dialog.defaults.alert.title);
		cfg.width =  cfg.width || 'auto';
		cfg.height = cfg.height || 'auto';
		cfg.url = false;
		cfg.closeable = false;
		cfg.resizable = false;
		cfg.maxable = false;
		cfg.minable = false;
		cfg.modal = true;
		cfg.theme = 'idlg-alert ' + (cfg.theme || '');
		cfg.content = '<div class="alert-content">'+ content + '</div>';
		
		cfg.button = btns.concat(cfg.button || []);
		
		return Dialog.open(cfg);
	};
	
	/**
	 * confirm 确认框
	 * @param content 提示内容，支持html元素
	 * @param yesFunc 点击“是”后执行的回调函数，可选
	 * @param noFunc 点击“否”后执行的回调函数，可选
	 * @config 提示框特性设置项，支持：width, height, title, yesLabel, noLabel, showCancel, follow 
	 */
	Dialog.confirm = function(content, yesFunc, noFunc, config) {
		var cfg = config || {};
			cfg.type = cfg.type || 'warning'; 
			cfg.title = cfg.title || Dialog.defaults.confirm.title;
			cfg.yesLabel = cfg.yesLabel || Dialog.defaults.confirm.yesLabel;

		var btns = [{label: cfg.noLabel || Dialog.defaults.confirm.noLabel, callback: noFunc }];
			cfg.button = btns.concat(cfg.button || []);
		
		return Dialog.alert(content, yesFunc, cfg);
	};
	
	Dialog.success = function(content, okFunc, config) {
		config = config || {};
		config.type = 'success';
		config.title = config.title || '成功';
		return Dialog.alert(content, okFunc, config);
	};
	
	Dialog.warning = function(content, okFunc, config) {
		config = config || {};
		config.type = 'warning';
		config.title = config.title || '警告';
		return Dialog.alert(content, okFunc, config);
	};
	
	Dialog.error = function(content, okFunc, config) {
		config = config || {};
		config.type = 'error';
		config.title = config.title || '错误';
		return Dialog.alert(content, okFunc, config);
	};
	
	// 全局快捷键
	_EventHandler.bind(document, 'keydown', function (evt) {
		var target = evt.srcElement || evt.target,
			nodeName = target.nodeName,
			rinput = /^input|textarea$/i,
			focusDiag = _topWin._focusDialog,
			keyCode = evt.keyCode;

		if(!focusDiag || rinput.test(nodeName)) {
			return;
		}
		
		// ESC
		if(keyCode === 27) {
			focusDiag.close();
			return;
		}
		
		// Enter, left arrow, right arrow
		if(keyCode === 13 || keyCode === 37 || keyCode === 39) {
			var btns = focusDiag.DOM.buttons && focusDiag.DOM.buttons.getElementsByTagName('a');
			if(!btns || btns.length == 0) {
				return;
			}
			
			var len = btns.length, focusIndx = -1;
			for(var i = 0; i < len; ++i) {
				if(_css.has(btns[i], 'state-focus')){
					focusIndx = i;
					break;
				}
			}
			
			if(focusIndx == -1) {
				return;
			}
			
			// Enter
			if(keyCode === 13) {
				var btnId = btns[focusIndx].getAttribute('id');
				var fn = focusDiag._listeners[btnId] && focusDiag._listeners[btnId].callback;
				(typeof fn !== 'function' || fn.call(focusDiag) !== false) && focusDiag.close();
			}
			
			// <--
			if(keyCode === 37 && len > 1) {
				focusIndx = Math.max(--focusIndx, 0);
				if(!btns[focusIndx].disabled) {
					_css.remove(btns[focusIndx+1], 'state-focus');
					_css.add(btns[focusIndx], 'state-focus');
					btns[focusIndx].focus();
				}
			}
			// -->
			if(keyCode === 39 && len > 1) {
				focusIndx = Math.min(++focusIndx, len-1);
				if(!btns[focusIndx].disabled) {
					_css.remove(btns[focusIndx-1], 'state-focus');
					_css.add(btns[focusIndx], 'state-focus');
					btns[focusIndx].focus();
				}
			}
		}
	});
	
	// 浏览器窗口resize后重置对话框位置
	var rs_timer = null;
	_EventHandler.bind(window, 'resize', function () {
		clearTimeout(rs_timer);
		rs_timer = setTimeout(function() {
			for(var i = 0, len = _topWin['__dialog_list'].length; i < len; i++) {
				_topWin['__dialog_list'][i].resetPosition();
			}
			
			if(_isIE6) {
				var $mask = document.getElementById('_idlg_mask_');
				if($mask) {
					$mask.style.width = _winSize(window).sw + 'px';
					$mask.style.height = _winSize(window).sh + 'px';
				}
			}
		}, 100);
	});
	

// 模板
Dialog._tmpl = '<div class="idlg-outer" style="position:relative;">{rs_tmpl}'
//+	'<div class="idlg-inner">'
+		'<a href="javascript:void(0);" class="idlg-min">&nbsp;</a>'
+		'<a href="javascript:void(0);" class="idlg-max">&nbsp;</a>'
+		'<a href="javascript:void(0);" class="idlg-close">x</a>'
+		'<div class="idlg-header"><div class="idlg-title"></div></div>'
+		'<div class="idlg-main"></div>'
+		'<div class="idlg-footer" style="display:none;"><div class="idlg-buttons"></div></div>'
//+	'</div>'
+	'<span class="idlg-arrow" style="display:none;"><i class="arrow-out"></i><i class="arrow-in"></i></span>'
+'</div>';

Dialog.ifrm_tmpl = '<iframe src="about:blank" class="idlg-iframe" width="100%" height="100%" frameborder="0" scrolling="auto" hidefocus="true" allowtransparency="true"></iframe>'
+'<div class="idlg-iframecover" style="position:absolute;z-index:2;left:0;top:0;right:0;bottom:0;width:100%;height:100%;background-color:#ffffff;opacity:0;filter:alpha(opacity=0);display:none;"></div>';

Dialog.rs_tmpl = '<div class="idlg-n">&nbsp;</div><div class="idlg-ne">&nbsp;</div><div class="idlg-se">&nbsp;</div>'
+'<div class="idlg-s">&nbsp;</div><div class="idlg-sw">&nbsp;</div><div class="idlg-nw">&nbsp;</div>'
+'<div class="idlg-w">&nbsp;</div><div class="idlg-e">&nbsp;</div>';


/**
 * 默认配置
 */ 
Dialog.defaults = {

	/** 
	 * 窗口唯一标识，建议定义，这样可以避免重复弹出窗口
	 * @type String
	 */
	id: null,	
	
	/**
	 * 窗口标题，可以自定义；如果为 false，则隐藏标题
	 * @type String, false, null
	 */
	title: false,	
	
	/** 
	 * 窗口打开URL页面	
	 * @type String
	 */
	url: null,	  
	
	/**
	 * 窗口显示content字符串内容
	 * @type String, HTMLElement, function
	 */
	content: "",
	
	/**
	 * 窗口宽度， 默认为300px
	 * @type Number, String
	 */
	width: 300,

	/**
	 * 窗口高度，如果不指定，则自适应内容高度
	 * @type Number, String	
	 */
	height: 'auto',	
	
	/**
	 * 窗口水平显示位置，默认居中，支持百分比和具体数值
	 * @type Number, String(px, %)
	 */
	left: "50%",

	/**
	 * 窗口垂直显示位置，默认黄金分割比例显示，支持百分比和具体数值
	 * @type Number, String(px, %)
	 */
	top: "38.2%", 

	/**
	 * 窗口特殊主题样式（需要重写样式css），默认 默认主题样式
	 * @type String
	 */
	theme: null,
	
	/**
	 * 是否显示窗口右上角的关闭按钮
	 * @type Boolean
	 */
	closeable: true, 

	/**
	 * 是否显示最大化按钮
	 * @type Boolean
	 */
	maxable: false,
	
	/**
	 * 是否显示最小化按钮
	 * @type Boolean
	 */
	minable: false,
	
	/**
	 * 窗口是否允许拖动，默认允许
	 * @type Boolean
	 */
	dragable: true,

	/**
	 * 窗口是否允许 resize 大小，默认不允许
	 * @type Boolean
	 */
	resizable: false,

	/**
	 * 是否静止定位不动，不支持IE6
	 * @type Boolean
	 */
	fixed: true, 
	
	/**
	 * 窗口是否为模态窗口(是否显示背景遮罩层)，
	 * @type Boolean
	 */
	modal: true,
	
	/**
	 * 弹出的窗口显示在哪个元素附近
	 * @type HTMLElement, {target:"string|HTMLElement", placement:"top|bottom|left|right"}
	 */
	follow: null,
	
	/**
	 * 自定义按钮
	 * @type 按钮数组，按钮对象为：{id:'', label:'', width:'', disabled:true|false, 
	 *								focus:true|false, align:left|right|center, callback:function{}}
	 */
	button: [],

	/**
	 * 点击遮罩背景关闭窗口
	 * @type Boolean
	 */
	quickClose: false, 

	/**
   * 窗口显示的上下文环境，默认顶层窗口
	 * @type Window
	 */
	context: null,

	/**
	 * 窗口显示在指定的容器中，默认 document.body下
	 * @type Element
	 */
	 container: null,
	
	/**
	 * 自定义显示层级数
	 * @type Number
	 */
	zindex: 9999,    
	
	/**
	 * 重置窗口关闭事件，函数this对象为Dialog
	 * @type function
	 */
	closeEvent: null, 
	
	/**
	 * 重置窗口最大化事件，函数this对象为Dialog
	 * @type function
	 */
	maximizeEvent: null, 
	
	/**
	 * 重置窗口最小化事件，函数this对象为Dialog
	 * @type function
	 */
	minimizeEvent: null, 
	
	/**
	 * 窗口打开后，执行的事件
	 * @type function
	 */
	onLoad: null, 
	
	/**
	 * 当窗口显示后要执行的回调函数
	 * 注意和onLoad的区分，注：函数上下文this对象指向Dialog
	 * @type function
	 */
	onShow: null,

	/**
	 * 当窗口关闭后要执行的回调函数，注：函数上下文this对象指向Dialog
	 * @type function
	 */
	onClosed: null,
	
	/**
	 * 当窗口被拖动时要执行的回调函数，注：函数上下文this对象指向Dialog
	 * @type function({'left':x, 'top':y})
	 */
	onDrag: null,
	
	/**
	 * 当窗口被改变大小时要执行的回调函数，注：函数上下文this对象指向Dialog
	 * @type function({'width':w, 'height':h, 'left':x, 'top':y})
	 */
	onResize: null,
	
	// 窗口resize的最小尺寸限制
	_resize: { 'minWidth': 100, 'minHeight': 100 },
	
	alert: {
		title: '信息',
		yesLabel: '确定'
	},

	confirm: {
		title: '询问',
		yesLabel: '确定',
		noLabel: '取消'
	}
	
};

	// 支持 AMD module，比如：使用 requirejs 加载
	if(typeof define === 'function' && define.amd) {
		define(function() {
			return Dialog;
		})
	}
	
	// 提供 noConflict方法避免Dialog名称冲突
	var _Dialog = window.Dialog;
	Dialog.noConflict = function() {
		window.Dialog = _Dialog;
		return Dialog;
	};
	
	// 导出Dialog为全局变量
	window.Dialog = Dialog;

})(window, document);


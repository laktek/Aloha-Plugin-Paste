/*!
* Aloha Editor
* Author & Copyright (c) 2010 Gentics Software GmbH
* aloha-sales@gentics.com
* Licensed unter the terms of http://www.aloha-editor.com/license.html
*/

define(
['aloha/core', 'aloha/plugin', 'aloha/jquery', 'aloha/command', 'aloha/floatingmenu', 
 'paste/genericpastehandler', 'paste/oembedpastehandler', 'paste/wordpastehandler', 'paste/formatlesshandler', 
 'i18n!paste/nls/i18n', 'i18n!aloha/nls/i18n',
 'commands/inserthtml'],
function(Aloha, Plugin, jQuery, Commands, FloatingMenu, GenericPasteHandler, OEmbedPasteHandler, WordPasteHandler, FormatlessPasteHandler, i18n, i18nCore) {
	"use strict";

	// Private Vars and Methods
	var
		GENTICS = window.GENTICS,
		$window = jQuery(window),
		$document = jQuery(document),
		$pasteDiv = jQuery('<div style="position:absolute; top:-100000px; left:-100000px"></div>')
			.contentEditable(true),
		pasteHandlers = [],
		pasteRange = null,
		pasteEditable = null,
		scrollTop = 0,
		scrollLeft = 0,
		height = 0;
	
	
	/**
	 * This method redirects the paste into the pasteDiv. After the paste occurred,
	 * the content in the pasteDiv will be modified by the pastehandlers and will
	 * then be copied into the editable.
	 */
	function redirectPaste() {

		// store the current range
		pasteRange = new GENTICS.Utils.RangeObject(true);
		pasteEditable = Aloha.activeEditable;

		// store the current scroll position
		scrollTop = $window.scrollTop();
		scrollLeft = $window.scrollLeft();
		height = $document.height();

		// empty the pasteDiv
		$pasteDiv.text('');

		// blur the active editable
		if (pasteEditable) {
			// TODO test in IE!
			//pasteEditable.blur();
			// alternative:
			pasteEditable.obj.blur();
		}

		// set the cursor into the paste div
		GENTICS.Utils.Dom.setCursorInto($pasteDiv.get(0));

		// focus the pasteDiv
		$pasteDiv.focus();
	};

	/**
	 * Get the pasted content and insert into the current editable
	 */
	function getPastedContent() {
		var that = this,
			i = 0,
			heightDiff = 0, 
			pasteDivContents;

		// call all paste handlers
		for ( i = 0; i < pasteHandlers.length; ++i) {
			pasteHandlers[i].handlePaste($pasteDiv);
		}

		// insert the content into the editable at the current range
		if (pasteRange && pasteEditable) {
			
			// activate and focus the editable
			// @todo test in IE
			//pasteEditable.activate();
			pasteEditable.obj.focus();

			pasteDivContents = $pasteDiv.html();

			Aloha.execCommand('insertHTML', false, pasteDivContents, pasteRange);

			// finally scroll back to the original scroll position, plus eventually difference in height
//			if (scrollTop !== false && scrollLeft !== false && this.height !== false) {
				heightDiff = jQuery(document).height() - height;
				$window.scrollTop(scrollTop + heightDiff);
				$window.scrollLeft(scrollLeft);
//			}
		}
		
		// unset temporary values
		pasteRange = null;
		pasteEditable = null;
		scrollTop = 0;
		scrollLeft = 0;
		height = 0;

		// empty the pasteDiv
		$pasteDiv.text('');
	};


	// Public Methods
	return Plugin.create('paste', {
		
		/**
		 * All registered paste handlers
		 */
		pasteHandlers: pasteHandlers,

    /**
     * Configure Formatless pasting
     */
    formatlessPasteOption: false, 

		/**
		 * Initialize the PastePlugin
		 */
		init: function() {
			var that = this;

      if ( typeof this.settings.formatlessPasteOption !== 'undefined') {
				this.formatlessPasteOption = this.settings.formatlessPasteOption;
			}

			// append the div into which we past to the document
			jQuery('body').append($pasteDiv);

			// register default handler
			// TODO They should be configured!
			this.register(new WordPasteHandler());
			this.register(new OEmbedPasteHandler());
			this.register(new GenericPasteHandler());

      if(this.formatlessPasteOption) {
        this.registerFormatlessPasteHandler(); 
      };

			// subscribe to the event editableCreated to redirect paste events into our pasteDiv
			// TODO: move to paste command
			// http://support.mozilla.com/en-US/kb/Granting%20JavaScript%20access%20to%20the%20clipboard
			// https://code.google.com/p/zeroclipboard/
			Aloha.bind('aloha-editable-created', function(event, editable) {
				
				// the events depend on the browser
				if (jQuery.browser.msie) {
					// only do the ugly beforepaste hack, if we shall not access the clipboard
					if (that.settings.noclipboardaccess) {
						editable.obj.bind('beforepaste', function(event) {
							redirectPaste();
							event.stopPropagation();
						});
					} else {
						// this is the version using the execCommand for IE
						editable.obj.bind('paste', function(event) {
							redirectPaste();
							var range = document.selection.createRange();
							range.execCommand('paste');
							getPastedContent();

							// call smartContentChange after paste action
							Aloha.activeEditable.smartContentChange(event);
							event.stopPropagation();
							return false;
						});
					}
				} else {
					editable.obj.bind('paste', function(event) {
						redirectPaste();
						window.setTimeout(function() {
							getPastedContent();
						}, 10);

						// call smartContentChange after paste action
						Aloha.activeEditable.smartContentChange(event);
						event.stopPropagation();
					});
				}
			});

			// bind a handler to the paste event of the pasteDiv to get the
			// pasted content (but do this only once, not for every editable)
			if (jQuery.browser.msie && that.settings.noclipboardaccess) {
				$pasteDiv.bind('paste', function(event) {
					window.setTimeout(function() {
						getPastedContent();
					}, 10);

					// call smartContentChange after paste action
					Aloha.activeEditable.smartContentChange(event);
					event.stopPropagation();
				});
			}
		},

    /**
     * Register Formatless paste handler
     */
    registerFormatlessPasteHandler: function(){
      //register format-less paste handler
      var formatless_paste_handler = new FormatlessPasteHandler();
      this.register(formatless_paste_handler);

      // add button to toggle format-less pasting
      this.formatlessPasteButton = new Aloha.ui.Button({
				'iconClass' : 'aloha-button aloha-button-formatless-paste',
				'size' : 'small',
				'onclick' : function () { 
          //toggle the value of allowFormatless
          formatless_paste_handler.enabled = !formatless_paste_handler.enabled;
        },
				'tooltip' : i18n.t('button.formatlessPaste.tooltip'),
				'toggle' : true
			});
      FloatingMenu.addButton(
				'Aloha.continuoustext',
				this.formatlessPasteButton,
				i18nCore.t('floatingmenu.tab.format'),
				2
			);
    },

		/**
		 * Register the given paste handler
		 * @param pasteHandler paste handler to be registered
		 */
		register: function(pasteHandler) {
			pasteHandlers.push(pasteHandler);
		}
	});
});

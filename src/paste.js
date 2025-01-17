/*!
* Aloha Editor
* Author & Copyright (c) 2010 Gentics Software GmbH
* aloha-sales@gentics.com
* Licensed unter the terms of http://www.aloha-editor.com/license.html
*/

(function(window, undefined) {
	"use strict";

	var
		jQuery = window.alohaQuery || window.jQuery, $ = jQuery,
		GENTICS = window.GENTICS,
		Aloha = window.Aloha;

	/**
	 * Register the PastePlugin as Aloha.Plugin
	 */
	Aloha.PastePlugin = new Aloha.Plugin('paste');

	/**
	 * All registered paste handlers
	 */
	Aloha.PastePlugin.pasteHandlers = [];

	/**
	 * Initialize the PastePlugin
	 */
	Aloha.PastePlugin.init = function() {
		var that = this;

		// first of all, generate an editable div, into which the pasting is done
		this.pasteDiv = jQuery('<div style="position:absolute; top:-100000px; left:-100000px"></div>');
		this.pasteDiv.contentEditable(true);
		jQuery('body').append(this.pasteDiv);

		// subscribe to the event editableCreated to redirect paste events into our pasteDiv
		Aloha.bind('aloha-editable-created', function(event, editable) {
			// the events depend on the browser
			if (jQuery.browser.msie) {
				editable.obj.bind('beforepaste', function(event) {
					that.redirectPaste();
					event.stopPropagation();
				});
			} else {
				editable.obj.bind('paste', function(event) {
					that.redirectPaste();
					window.setTimeout(function() {
						that.getPastedContent(event);
					}, 10);
					event.stopPropagation();
				});
			}
		});

		// for msie, we need to bind an event to our pasteDiv
		if (jQuery.browser.msie) {
			this.pasteDiv.bind('paste', function(event) {
				window.setTimeout(function() {that.getPastedContent(event);}, 10);
			});
		}
	};

	/**
	 * This method redirects the paste into the pasteDiv. After the paste occurred,
	 * the content in the pasteDiv will be modified by the pastehandlers and will
	 * then be copied into the editable.
	 */
	Aloha.PastePlugin.redirectPaste = function() {
		// store the current range
		this.currentRange = new GENTICS.Utils.RangeObject(true);
		this.currentEditable = Aloha.activeEditable;

		// store the current scroll position
		var w = jQuery(window);
		this.scrollTop = w.scrollTop();
		this.scrollLeft = w.scrollLeft();
		this.height = jQuery(document).height();

		// empty the pasteDiv
		this.pasteDiv.text('');

		// blur the active editable
		if (this.currentEditable) {
			// @todo test in IE!
			//this.currentEditable.blur();
			// alternative:
			this.currentEditable.obj.blur();
		}

		// set the cursor into the paste div
		GENTICS.Utils.Dom.setCursorInto(this.pasteDiv.get(0));

		// focus the pasteDiv
		this.pasteDiv.focus();
	};

	/**
	 * Get the pasted content and insert into the current editable
	 */
	Aloha.PastePlugin.getPastedContent = function(event) {
		var that = this,
			i, heightDiff, pasteDivContents, w;

		// call all paste handlers
		for ( i = 0; i < this.pasteHandlers.length; ++i) {
			this.pasteHandlers[i].handlePaste(this.pasteDiv);
		}

		// delete currently selected contents
		// TODO the check here is needed as the current aloha stable branch will not have this function
		// it has to be removed after merging 0.10 and the gentics fork
		if (this.currentRange.deleteContents) {
            this.currentRange.deleteContents();
		}

		// insert the content into the editable at the current range
		if (this.currentRange && this.currentEditable) {
			pasteDivContents = this.pasteDiv.contents();
			for ( i = pasteDivContents.length - 1; i >= 0; --i) {
				// insert the elements
				that.pasteElement(pasteDivContents.get(i));
			}

			// activate and focus the editable
			// @todo test in IE
			//this.currentEditable.activate();
			this.currentEditable.obj.focus();

			// set the cursor after the inserted DOM element
			if (pasteDivContents.length > 0) {
				GENTICS.Utils.Dom.setCursorAfter(pasteDivContents.get(pasteDivContents.length - 1));
			} else {
				// if nothing was pasted, just reselect the old range
				this.currentRange.select();
			}

			// finally scroll back to the original scroll position, plus eventually difference in height
			if (this.scrollTop !== false && this.scrollLeft !== false && this.height !== false) {
				w = jQuery(window);
				heightDiff = jQuery(document).height() - this.height;
				w.scrollTop(this.scrollTop + heightDiff);
				w.scrollLeft(this.scrollLeft);
			}
		}
		this.currentRange = false;
		this.currentEditable = false;
		this.scrollTop = false;
		this.scollLeft = false;
		this.height = false;

		// call smartContentChange after paste action
		Aloha.activeEditable.smartContentChange(event);

		// empty the pasteDiv
		this.pasteDiv.text('');
	};

	/**
	 * Paste the given object into the current selection.
	 * If inserting fails (because the object is not allowed to be inserted), unwrap the contents and try with that.
	 * @param object object to be pasted
	 */
	Aloha.PastePlugin.pasteElement = function(object) {
		var jqObject = jQuery(object),
			that = this,
			contents, i;
		
		// try to insert the element into the DOM
		if (!GENTICS.Utils.Dom.insertIntoDOM(jqObject, this.currentRange, this.currentEditable.obj, false)) {
			// if that is not possible, we unwrap the content and insert every child element
			 contents = jqObject.contents();

			// when a block level element was unwrapped, we at least insert a break
			if (GENTICS.Utils.Dom.isBlockLevelElement(object) || GENTICS.Utils.Dom.isListElement(object)) {
				that.pasteElement(jQuery('<br/>').get(0));
			}

			// and now all children (starting from the back)
			for ( i = contents.length - 1; i >= 0; --i) {
				that.pasteElement(contents[i]);
			}
		}
	};

	/**
	 * Register the given paste handler
	 * @param pasteHandler paste handler to be registered
	 */
	Aloha.PastePlugin.register = function(pasteHandler) {
		this.pasteHandlers.push(pasteHandler);
	};

	/**
	 * Constructor for a paste handler
	 */
	Aloha.PastePlugin.PasteHandler = function() {
		Aloha.PastePlugin.register(this);
	};

	/**
	 * Method that handles the pasted content
	 */
	Aloha.PastePlugin.PasteHandler.prototype.handlePaste = function(jqPasteDiv) {};

})(window);

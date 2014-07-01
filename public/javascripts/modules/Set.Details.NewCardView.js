Cards.module('Set.Details', function(Details, App) {
	Details.NewCardView = Backbone.Marionette.ItemView.extend({
		template: "#set-details-newcard",
		events: {
			"click .btn-success": "saveCard",
			"click .btn.cancel": "cancel",
			"click .btn-pictureSearch": "pictureSearch",
			"keyup input": "keyupInput",
			"focus input": "focusInput"
		},
		ui: {
			saveBtn: ".btn-success",
			cancelBtn: ".btn.cancel",
			picSearchFrontbtn: "#set-details-newcard-btn-pic-front-seach",
			pictureSearchModal: "#pictureSearchModal"
		},
		cancel: function(ev) {
			history.back();
		},
		saveCard: function(ev) {
			this.ui.saveBtn.button('loading');
			var that = this;

			var setId = this.model.get('id');
			var setName = this.model.get('name');

			var card = new Cards.Entities.Card({
				front: {
					text: $("#front-textarea").val().replace(/(<br>\s*)+$/,''),
					text_plain: $("#front-textarea").val().replace(/(<([^>]+)>)/ig,""),
					picture: $("#set-details-newcard-input-pic-front-search").val() || null,
					video: null
				},
				back: {
					text: $("#back-textarea").val().replace(/(<br>\s*)+$/,''),
					text_plain: $("#back-textarea").val().replace(/(<([^>]+)>)/ig,""),
					picture: $("#set-details-newcard-input-pic-back-search").val() || null,
					video: null
				},
				setId: setId
			});
			if(card.isValid()) {
				card.save({}, {
					success: function(model, response) {
						that.hideErrors();
						console.log("card saved");
						history.back();
					},
					error: function(model, error) {
						console.log(error);
						that.ui.saveBtn.button('reset');
						alert("something went wrong");
					}
				});
			} else {
				this.showErrors(card.validationError);
				this.ui.saveBtn.button('reset');
			}
		},
		showErrors: function(errors) {
			this.$('.help-block').text('');
			this.$('.cardtext').removeClass('has-error');
		    _.each(errors, function (error) {
		        var cardside = this.$('td.' + error.name);
		        cardside.addClass('has-error');
		        var helptext = this.$('span.' + error.name);
		        helptext.text(error.message);
		    }, this);
		},

		hideErrors: function () {
			this.$('.help-block').text('');
			this.$('.cardtext').removeClass('has-error');
		},
		pictureSearch: function(ev) {
			ev.preventDefault();
			var that = this;

			var searchInput = $(ev.target).parent().prev();
			var searchString = searchInput.val().trim();

			if (searchString != '') {
				setTimeout(function(){
					var imageSearch = new google.search.ImageSearch();
					imageSearch.setResultSetSize(8);
					imageSearch.setNoHtmlGeneration();
					imageSearch.setRestriction(
					  google.search.Search.RESTRICT_SAFESEARCH,
					  google.search.Search.SAFESEARCH_STRICT
					);

					imageSearch.setSearchCompleteCallback(this, function(){
						console.log("results", imageSearch.results);
						if (imageSearch.results && imageSearch.results.length > 0) {

							var results = imageSearch.results;

							var table = $(document.createElement('table'));
							table.attr('id', 'google-imagesearch-result');
							var tbody = $(document.createElement('tbody'));

							table.append(tbody);
							$("#pictureSearchModal-body").empty();
							$("#pictureSearchModal-body").append(table);

							var tr;
							for(var i = 0; i < results.length; i++) {
								if(!(i % 2)) {
									tr = $(document.createElement('tr'));
								}

								var result = results[i];

								var td = $(document.createElement('td'));

								var imgElem = $(document.createElement('img'));
								imgElem.attr('src', result.tbUrl);
								imgElem.attr('height', result.tbHeight*1.5);
								imgElem.attr('width', result.tbWidth*1.5);
								imgElem.attr('alt', result.url);
								imgElem.addClass('img-polaroid');

								imgElem.bind('click', function(ev){
									searchInput.val($(ev.target).attr('alt'));
									that.ui.pictureSearchModal.modal('hide');
									$("#pictureSearchModal-body").empty();
								});
								td.append(imgElem);
								console.log(imgElem);
								tr.append(td);

								if(i % 2) {
									tbody.append(tr);
								}
							}
						} else {
							alert("Es wurden keine passenden Ergebnisse gefunden");
							that.ui.pictureSearchModal.modal('hide');
						}
			        }, null);

			        imageSearch.execute(searchString);
			        $("#pictureSearchModal-footer").empty();
			        $("#pictureSearchModal-footer").append(google.search.Search.getBranding());

				}, 100);

				$("#pictureSearchModal-body").scrollTop();
				this.ui.pictureSearchModal.modal('show');
			}
			this.ui.pictureSearchModal.on('hide', function() {
				$("#pictureSearchModal-body").empty();
			})
		},
		keyupInput: function(ev) {
			var value = $(ev.target).val();
		    var urlregex = new RegExp("^(http|https|ftp)\://([a-zA-Z0-9\.\-]+(\:[a-zA-Z0-9\.&amp;%\$\-]+)*@)*((25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9])\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[0-9])|([a-zA-Z0-9\-]+\.)*[a-zA-Z0-9\-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(\:[0-9]+)*(/($|[a-zA-Z0-9\.\,\?\'\\\+&amp;%\$#\=~_\-]+))*$");
    		if (urlregex.test(value)) {
        		$(ev.target).next().attr('disabled', 'disabled');
    		} else {
    			$(ev.target).next().removeAttr('disabled');
    		}
		},
		focusInput: function(ev) {
			var loadSearch = function() {
				console.log("search loaded");
			}

			google.load('search', '1', {callback: loadSearch });
		},
		onShow: function() {
			var editorConfig = {
				"font-styles": false,
				"color": true,
				"lists": true,
				"image": false,
				toolbar: { code:  function(locale, options) {
				    return '<li><a class="btn btn-default btn-sm" title="Code" data-wysihtml5-command="formatInline" data-wysihtml5-command-value="code" href="javascript:;" unselectable="on"><i class="glyphicon glyphicon-copyright-mark"></i></li>'
				   }
				}
			}
			setTimeout(function(){
				$("#front-textarea").wysihtml5(editorConfig).focus();

				var wysiFontButtonListFront = this.$('ul.wysihtml5-toolbar')[0].childNodes[1];
				$(wysiFontButtonListFront.firstChild.childNodes[1]).hide();

				var wysiFontButtonListBack = this.$('ul.wysihtml5-toolbar')[1].childNodes[1];
				$(wysiFontButtonListBack.firstChild.childNodes[1]).hide();
			}, 50);
			$("#back-textarea").wysihtml5(editorConfig);

		}
	});
});

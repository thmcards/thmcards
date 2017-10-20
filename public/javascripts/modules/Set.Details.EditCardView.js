Cards.module('Set.Details', function(Details, App) {
	Details.EditCardView = Backbone.Marionette.ItemView.extend({
		template: "#set-details-editcard",
		events: {
			"click .btn.save": "editCard",
			"click .btn.cancel": "cancel",
			"click .btn-warning": "deleteCard",
			"click .btn-card-delete": "deleteClicked",
			"click .btn-pictureSearch": "pictureSearch",
			"keyup input": "keyupInput",
			"focus input": "focusInput"
		},
		ui: {
			saveBtn: ".btn.save",
			cancelBtn: ".btn.cancel",
			deleteBtn: ".btn-card-delete",
			picSearchFrontbtn: "#set-details-editcard-btn-pic-front-seach",
			pictureSearchModal: "#editcard-pictureSearchModal"
		},
		cancel: function(ev) {
			this.model.fetch();
			history.back();
		},
		editCard: function(ev) {
			this.ui.saveBtn.button('loading');
			var that = this;


			var	front = {
					text: $("#editfronttext-content-holder").html().replace(/(<br>\s*)+$/,''),
					text_plain: $("#editfronttext-content-holder").html().replace(/(<([^>]+)>)/ig,""),
					picture: $("#set-details-editcard-input-pic-front-search").val() || null,
					video: null
				};
			var	back = {
					text: $("#editbacktext-content-holder").html().replace(/(<br>\s*)+$/,''),
					text_plain: $("#editbacktext-content-holder").html().replace(/(<([^>]+)>)/ig,""),
					picture: $("#set-details-editcard-input-pic-back-search").val() || null,
					video: null
				};

			this.model.set({
				front: front,
				back: back
			})

			if(this.model.isValid()) {
				this.model.save({}, {
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
				this.showErrors(this.model.validationError);
				this.ui.saveBtn.button('reset');
			}
		},
		resetDeleteButton: function(ev) {
			if ($("a.btn-card-delete").hasClass("btn-warning")) {
					$("a.btn-card-delete").removeClass("btn-warning");
					$("a.btn-card-delete").addClass("btn-danger");
					$("a.btn-card-delete").text("Karte löschen");
			}
		},
		deleteClicked: function(ev) {
			$("a.btn-card-delete").removeClass("btn-danger");
			$("a.btn-card-delete").text("Sicher?");
			$("a.btn-card-delete").addClass("btn-warning");
		},
		deleteCard: function(ev) {
			var that = this;
			this.ui.deleteBtn.button('loading');

			this.model.destroy({
				success : function(resp){
					Cards.LAST_VIEWED_OR_MODIFIED_CARD_ID = undefined;
					console.log("gelöscht");
					history.back();
				},
				error : function(err) {
					that.ui.deleteBtn.button('reset');
					console.log('error callback');
					// this error message for dev only
					alert('There was an error. See console for details');
					console.log(err);
				}
			});

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
						if (imageSearch.results && imageSearch.results.length > 0) {

							var results = imageSearch.results;

							var table = $(document.createElement('table'));
							table.attr('id', 'google-imagesearch-result');
							var tbody = $(document.createElement('tbody'));

							table.append(tbody);
							$("#editcard-pictureSearchModal-body").empty();
							$("#editcard-pictureSearchModal-body").append(table);

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
									$("#editcard-pictureSearchModal-body").empty();
								});
								td.append(imgElem);
								tr.append(td);

								if(i % 2) {
									tbody.append(tr);
								}
							}
						} else {
							alert("Es wurden keine passenden Ergebnisse gefunden");
							this.ui.pictureSearchModal.modal('hide');
						}
					}, null);

					imageSearch.execute(searchString);
					$("#editcard-pictureSearchModal-footer").empty();
					$("#editcard-pictureSearchModal-footer").append(google.search.Search.getBranding());

				}, 100);

				$("#editcard-pictureSearchModal-body").scrollTop();
				this.ui.pictureSearchModal.modal('show');
			}
			this.ui.pictureSearchModal.on('hide', function() {
				$("#editcard-pictureSearchModal-body").empty();
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
			var that=this;
			var editorConfig={
					autofocus:false,
					savable:false,
					fullscreen:false,
					hiddenButtons:["cmdImage"],
					additionalButtons: [
						[{
							name: "groupMisc",
							data: [{
								name: "cmdTex",
								toggle: true, // this param only take effect if you load bootstrap.js
								title: "Tex",
								icon: "glyphicon glyphicon-usd",
								callback: function(e){
									var chunk, cursor,
									selected = e.getSelection(),
									content = e.getContent();
									// transform selection and set the cursor into chunked text
									e.replaceSelection("$ "+content+" $");
									cursor = selected.start
									// Set the cursor
									e.setSelection(cursor,cursor+content.length+4)
									}
								}]
						}]
					],
					onChange: function(e){
						$("#editfronttext-content-holder").html(e.getContent());
					},
					onShow: function(e){
						$("#editfronttext-content-holder").html(that.model.attributes.back.text);
						e.setContent(that.model.attributes.front.text);
					}
				}
				$("#editcard-front-textarea").markdown(editorConfig).focus();
				editorConfig.onChange=function(e){
					$("#editbacktext-content-holder").html(e.getContent());
				}
				editorConfig.onShow=function(e){
					$("#editbacktext-content-holder").html(that.model.attributes.back.text);
					e.setContent(that.model.attributes.back.text);
				}
				$("#editcard-back-textarea").markdown(editorConfig);


			$("#set-details-editcard-input-pic-front-search").val(that.model.attributes.front.picture);
			$("#set-details-editcard-input-pic-back-search").val(that.model.attributes.back.picture);

		},
		onClose: function(){
			$(".btn-cardDelete").off('clickout');
		},
		onRender: function(){
			this.$("a.btn-card-delete").clickout(this.resetDeleteButton);

		}
	});
});

Cards.module('Set.Details', function(Details, App) {
	Details.NewCardView = Backbone.Marionette.ItemView.extend({
		template: "#set-details-newcard",
		events: {
			"click .btn-success": "saveCard",
			"click .btn.cancel": "cancel",
			"click .btn-pictureSearch": "pictureSearch",
			"keyup input": "blurInput"
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

			var setId = this.model.get('id');
			var setName = this.model.get('name');

			var card = new Cards.Entities.Card({
				front: $("#front-textarea").val(),
				back: $("#back-textarea").val(),
				setId: setId
			});

			if(card.isValid()) {
				card.save({}, {
					success: function(model, response) {
						Cards.trigger("set:details", setName.replace(/[^a-zA-Z0-9-_]/g, '_'), setId);
					},
					error: function(model, error) {
						this.ui.saveBtn.button('reset');
						alert("something went wrong");
					}
				});
			} else {
				alert('not valid');
				this.ui.saveBtn.button('reset');
			}
		},
		pictureSearch: function(ev) {
			ev.preventDefault();
			var that = this;

			var searchInput = $(ev.target).prev();
			var searchString = searchInput.val();

			console.log("searching for", searchString);

			
			var loadSearch = function() {
				console.log("search loaded");
			}
			
			google.load('search', '1', {callback: loadSearch });

			setTimeout(function(){
				var imageSearch = new google.search.ImageSearch();
				imageSearch.setResultSetSize(8);
				imageSearch.setNoHtmlGeneration();
				imageSearch.setRestriction(
				  google.search.Search.RESTRICT_SAFESEARCH,
				  google.search.Search.SAFESEARCH_STRICT
				);
				imageSearch.setRestriction(
				  google.search.ImageSearch.RESTRICT_IMAGESIZE,
				  google.search.ImageSearch.IMAGESIZE_MEDIUM
				);
				imageSearch.setRestriction(
					google.search.ImageSearch.RESTRICT_RIGHTS,
                    google.search.ImageSearch.RIGHTS_REUSE
                );
                imageSearch.setRestriction(
				  google.search.ImageSearch.RESTRICT_FILETYPE,
				  google.search.ImageSearch.FILETYPE_JPG
				);

				imageSearch.setSearchCompleteCallback(this, function(){

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
							imgElem.attr('title', result.url);
							imgElem.attr('alt', result.title);
							imgElem.addClass('img-polaroid');

							imgElem.bind('click', function(ev){
								searchInput.val($(ev.target).attr('title'));
								that.ui.pictureSearchModal.modal('hide');
								$("pictureSearchModal-body").empty();
							});
							td.append(imgElem);
							console.log(imgElem);
							tr.append(td);

							if(i % 2) {
								tbody.append(tr);
							}
						}
					}
		        }, null);

		        imageSearch.execute(searchString);
		        $("#pictureSearchModal-footer").empty();
		        $("#pictureSearchModal-footer").append(google.search.Search.getBranding());

			}, 300);
		        

			this.ui.pictureSearchModal.modal('show');

			this.ui.pictureSearchModal.on('hidden', function() {
				$("pictureSearchModal-body").empty();
			})
		},
		blurInput: function(ev) {
			var value = $(ev.target).val();
		    var urlregex = new RegExp("^(http|https|ftp)\://([a-zA-Z0-9\.\-]+(\:[a-zA-Z0-9\.&amp;%\$\-]+)*@)*((25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9])\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[0-9])|([a-zA-Z0-9\-]+\.)*[a-zA-Z0-9\-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(\:[0-9]+)*(/($|[a-zA-Z0-9\.\,\?\'\\\+&amp;%\$#\=~_\-]+))*$");
    		if (urlregex.test(value)) {
        		$(ev.target).next().attr('disabled', 'disabled');
    		} else {
    			$(ev.target).next().removeAttr('disabled');
    		}
		},
		onShow: function() {
			var editorConfig = {
				"font-styles": false,
				"color": false,
				"lists": false,
				"image": false
			}

			$("#front-textarea").wysihtml5(editorConfig);
			$("#back-textarea").wysihtml5(editorConfig);
		}
	});
});
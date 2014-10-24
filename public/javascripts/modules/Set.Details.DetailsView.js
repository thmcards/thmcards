Cards.module('Set.Details', function(Details, App) {
	Details.ItemView = Backbone.Marionette.ItemView.extend({
		template: "#set-details-item",
		className: "item",
		initialize: function() {          
		},
		events: {
			"click a": "linkClicked",
			"click div.box": "cardClicked"
		},
		cardClicked: function(ev) {
			ev.preventDefault();

			var front = $(ev.currentTarget).find('div.front');
			var back = $(ev.currentTarget).find('div.back');
			var frontSymbol = $("div.item.active").find("img.cardfront-symbol")
			var backSymbol = $("div.item.active").find("img.cardback-symbol")

			if(ev.target.nodeName == "DIV" || ev.target.nodeName == "SPAN" || ev.target.nodeName == "UL" || ev.target.nodeName == "OL" || ev.target.nodeName == "LI") {
				front.toggle();
				back.toggle();
				this.$el.find("div.cardContent.back").toggleClass('active');
				this.$el.find("div.cardContent.front").toggleClass('active');
				frontSymbol.toggle();
				backSymbol.toggle();
			}
		},
		linkClicked: function(ev) {
			ev.preventDefault();
		},
		onRender: function(){
			i18ninit();
		}
	});

	Details.EmptyView = Backbone.Marionette.ItemView.extend({
		template: "#set-details-item-empty",
		className: "empty-item",
		onRender: function(){
			i18ninit();
		}
	});

	Details.DetailsView = Backbone.Marionette.CompositeView.extend({
		emptyView: Details.EmptyView,
		itemView: Details.ItemView,
		itemViewContainer: "div.carousel-inner",
		template: "#set-details-collection",
		ui: {
			modalView: "#pictureModal"
		},
		initialize: function() {            
            $(document).on('keyup', this.keyHandler);
		},
		remove: function(){
            $(document).off('keyup', this.keyHandler);
        },
		events: {
			"click a.carousel-control": "cycleCarousel",
			"click button.learn": "learnClicked",
			"click button.memo": "memoClicked",
			"click button.play-meteor": "playMeteor",
			"click a.btn-editCard": "editClicked",
			"click a.btn-showPictureModal": "showModal",
			"click a.btn-deleteCard": "deleteClicked",
    		"click div.box": "checkForPicture"
		},
		keyHandler: function(ev){		  
		    if(window.location.hash.indexOf("details") != -1){            			        
                switch (ev.keyCode) {
                    //Turn card with ctrl key
                    case 17 :                        
                        $('div.active>div.box').click();
                    break;
                    //Go to previous card with arrow left
                    case 37 :
                        $('#leftCarouselControl').click();                    
                    break;
                    //Go to next card with arrow right
                    case 39 :                    
                        $('#rightCarouselControl').click();
                    break;                    
                }                
            }
        },
		playMeteor: function(ev) {
			App.trigger("play:meteor", this.model.get("id"));
		},
		showModal: function(ev) {
			ev.preventDefault();

			this.showPictureModal();
		},
		editClicked: function(ev) {
			ev.preventDefault();

			var cardId = $("div.item.active").children(".box").attr("data-id");

			App.trigger("set:details:edit", this.model.get("_id"), cardId);
		},
		deleteClicked: function(ev) {
			ev.preventDefault();
			var cardId = $("div.item.active").children(".box").attr("data-id");

			var actualCard = this.collection.get(cardId);
			actualCard.destroy({
			    success : function(resp){
			    	console.log("card deleted");
			    },
			    error : function(err) {
			        console.log('error callback');
			        // this error message for dev only
			        alert('There was an error. See console for details');
			        console.log(err);
				}
			});
		},
		cycleCarousel: function(ev) {
        	ev.preventDefault();
			this.turnCardtoFront(ev);
			if($(ev.currentTarget).hasClass("left")) {
				this.$el.find(":first-child").carousel("prev");
			} else if($(ev.currentTarget).hasClass("right")) {
				this.$el.find(":first-child").carousel("next");
			}
		},
        
		turnCardtoFront: function(ev) {
			ev.preventDefault();

			var front = $("div.item.active").find("div.centered.front")
			var back = $("div.item.active").find("div.centered.back")
			var frontSymbol = $("div.item.active").find("img.cardfront-symbol")
			var backSymbol = $("div.item.active").find("img.cardback-symbol")

			if(back.hasClass('active')){
				front.toggle();
				back.toggle();
				front.toggleClass('active');
				back.toggleClass('active');
				frontSymbol.toggle();
				backSymbol.toggle();

			}
		},
		checkForPicture: function(ev) {
			if(this.collection.length !== 0) {
				var cardId = $("div.item.active").children(".box").attr("data-id");
				var actualCard = this.collection.get(cardId);
				var button = this.$el.find("a.btn-showPictureModal");

				if($("div.item.active").find("div.centered.front").hasClass('active')){
					if(actualCard.get('front').picture){
						button.show();
					} else if(!actualCard.get('front').picture){
						button.hide();
					}
				} else if($("div.item.active").find("div.centered.back").hasClass('active')) {
					if(actualCard.get('back').picture){
						button.show();
					} else if(!actualCard.get('back').picture){
						button.hide();
					}
				}
			}
		},
		showPictureModal: function() {
			var cardId = $("div.item.active").children(".box").attr("data-id");
			var actualCard = this.collection.get(cardId);
			var cardContent = null;

			if($("div.item.active").find("div.centered.front").hasClass('active')){
				cardContent = actualCard.get("front");
			} else if($("div.item.active").find("div.centered.back").hasClass('active')) {
				cardContent = actualCard.get("back");
			}

			var imgElem = $(document.createElement('img'));
			imgElem.attr('src', cardContent.picture);
			imgElem.attr('alt', cardContent.text_plain);
			imgElem.attr('width', "538px");

			$("#setdetails-pictureModal-body").empty();
			$("#setdetails-pictureModal-body").append(imgElem);

			this.ui.modalView.modal('show');
		},
		learnClicked: function(ev) {
			App.trigger("set:learn", this.model.get("_id"));
		},
		memoClicked: function(ev) {
			App.trigger("set:memo", this.model.get("_id"));
		},
		onRender: function() {
			i18ninit();
			var that = this;
			var cardCarousel = this.$el.find('div#cardCarousel');


			if(this.collection.length == 0) {
				this.$el.find("button.play-meteor").prop('disabled', true);
				this.$el.find("button.learn").prop('disabled', true);
				this.$el.find("button.memo").prop('disabled', true);
			}

			if(this.collection.length <= 1) {
				this.$el.find("a.carousel-control").hide();
			}

			if (Cards.LAST_VIEWED_OR_MODIFIED_CARD_ID === undefined) {
				this.$el.find("div.item").first().addClass("active");
			} else {
				this.$el.find('div.item div[data-id="' + Cards.LAST_VIEWED_OR_MODIFIED_CARD_ID + '"]').parent().addClass("active");
				Cards.LAST_VIEWED_OR_MODIFIED_CARD_ID = undefined;
			}

			var cardCount = this.$('.item').length;
			var currentIndex = this.$('div.item.active').index() + 1;

			cardCarousel.carousel({ interval: false });

			cardCarousel.on('slid.bs.carousel', function (ev) {
				ev.stopPropagation();
				if($(ev.target).hasClass( "carousel" )) {
					that.checkForPicture();
					currentIndex = that.$('div.item.active').index() + 1;
					that.$el.find("small.card-indicator").html(currentIndex+'/'+cardCount);
				}
			});
			var usr = JSON.parse($.cookie('usr'));
			$("#usr-name").text();
			$.get("/score/"+usr.username+"/"+this.model.get("_id"), function( data ) {
				$("#meteor-set-points").text(data.score);
			}).fail(function(){

			});

			$('#btnToListLayout').removeClass("active");
			$('#btnToCardLayout').addClass("active");

			if(this.collection.length !== 0) {
				var cardId = this.$el.find("div.item").children(".box").attr("data-id");
				var actualCard = this.collection.get(cardId);
				var setOwner = this.collection.at(0).get('owner');

				if(actualCard.get('front').picture){
					this.$el.find("a.btn-showPictureModal").show();
				}
				this.$el.find("small.card-indicator").html(currentIndex+'/'+cardCount);

				if(JSON.parse($.cookie('usr')).username == setOwner) {
					this.$el.find("a.btn-editCard").show();
				} else {
					this.$el.find("a.btn-editCard").hide();
				}
			}
		},
		onShow: function() {
			$('code').each(function(i, e) {hljs.highlightBlock(e)});
			MathJax.Hub.Queue(["Typeset", MathJax.Hub, this.el]);
		}
	});

	Details.ListItem = Backbone.Marionette.ItemView.extend({
		tagName: "tr",
	    template: "#set-details-listitem",
		onRender: function(){
			i18ninit();
		}
	});

	Details.ListEmptyView = Backbone.Marionette.ItemView.extend({
		tagName: "tr",
		template: "#set-details-listitem-empty",
		className: "empty-listitem",
		onRender: function(){
			i18ninit();
		}
	});

	Details.DetailsListView = Backbone.Marionette.CompositeView.extend({
		emptyView: Details.ListEmptyView,
		tagName: "table",
		className: "table table-bordered table-striped table-hover",
		itemView: Details.ListItem,
		itemViewContainer: "tbody",
		template: "#set-details-list",
		events: {
			"click a.btn-listEditCard": "editClicked",
			"click a.btn-listDeleteCard": "deleteClicked",
			"click a.btn-showPictureModalList": "showModal"
		},
		ui: {
			modalView: "#pictureModalList"
		},
		showModal: function(ev) {
			ev.preventDefault();

			this.showPictureModal(ev);
		},
		editClicked: function(ev) {
			ev.preventDefault();

			var cardId = $(ev.currentTarget).attr("data-id")
			App.trigger("set:details:edit", this.model.get("_id"), cardId);
		},
		deleteClicked: function(ev) {
			ev.preventDefault();
			var cardId = $(ev.currentTarget).attr("data-id")

			var actualCard = this.collection.get(cardId);
			actualCard.destroy({
			    success : function(resp){
			    	console.log("card deleted");
			    },
			    error : function(err) {
			        console.log(err);
				}
			});
		},
		showPictureModal: function(ev) {
			var cardId = $(ev.currentTarget).attr("data-id");
			var actualCard = this.collection.get(cardId);
			var cardContent = null;

			if($(ev.currentTarget).hasClass('card-front')){
				cardContent = actualCard.get("front");
			} else if($(ev.currentTarget).hasClass('card-back')) {
				cardContent = actualCard.get("back");
			}

			var imgElem = $(document.createElement('img'));
			imgElem.attr('src', cardContent.picture);
			imgElem.attr('title', cardContent.text);
			imgElem.attr('alt', cardContent.text);
			imgElem.attr('width', "538px");

			$("#setdetails-pictureModalList-body").empty();
			$("#setdetails-pictureModalList-body").append(imgElem);

			this.ui.modalView.modal('show');
		},
		onRender: function(ev) {
			i18ninit();
			$('#btnToListLayout').addClass("active");
			$('#btnToCardLayout').removeClass("active");

			if(this.collection.length !== 0) {
				var setOwner = this.collection.at(0).get('owner');

				if(JSON.parse($.cookie('usr')).username == setOwner) {
					this.$el.find("a.btn-listEditCard").show();
					this.$el.find("a.btn-listDeleteCard").show();
				} else {
					this.$el.find("a.btn-listEditCard").hide();
					this.$el.find("a.btn-listDeleteCard").hide();
				}
			}
		},
		onShow: function() {
			$('code').each(function(i, e) {hljs.highlightBlock(e)});
			MathJax.Hub.Queue(["Typeset", MathJax.Hub, this.el]);
		}
	});
});

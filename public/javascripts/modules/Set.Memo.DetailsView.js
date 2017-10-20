Cards.module('Set.Memo', function(Memo, App) {
	Memo.ItemView = Backbone.Marionette.ItemView.extend({
		template: "#set-memo-item",
		className: "item",
		events: {
			"click a": "linkClicked"
		},
		linkClicked: function(ev) {
			ev.preventDefault();
			console.log("link");

			//App.trigger("set:details", this.model.get("name").replace(/[^a-zA-Z0-9-_]/g, '_'), this.model.get("id"));
		},
		onRender: function(){
			i18ninit();
		}
	});
	Memo.EmptyView = Backbone.Marionette.ItemView.extend({
		template: "#set-memo-item-empty",
		className: "empty-item",
		onRender: function(){
			i18ninit();
		}
	});

	Memo.DetailsView = Backbone.Marionette.CompositeView.extend({
		emptyView: Memo.EmptyView,
		itemView: Memo.ItemView,
		itemViewContainer: "div.carousel-inner",
		template: "#set-memo-collection",
		ui: {
			modalView: "#pictureModalMemo"
		},
		initialize: function() {		      
            $(document).on('keyup', this.keyHandlerMemo);          
		},
		remove: function(){
            $(document).off('keyup', this.keyHandlerMemo);
        },
		events: {
			"click button.show-answer": "showAnswer",
			"click button.rate-answer": "rateAnswer",
			"click a.btn-showPictureModal": "showModal"			
		},
		keyHandlerMemo: function(ev){
            if(window.location.hash.indexOf("memo") != -1){            	
                switch (ev.keyCode) {
                    //Turn card with ctrl key
                    case 17 :                        
                        $('button.show-answer').click();
                    break;
                    //Rating in Memo Mode (0-5)
                    case 48 :
                        $('button#memoRate0').click();
                    break;
                    case 49 :
                        $('button#memoRate1').click();
                    break;
                    case 50 :
                        $('button#memoRate2').click();
                    break;
                    case 51 :
                        $('button#memoRate3').click();
                    break;
                    case 52 :
                        $('button#memoRate4').click();
                    break;
                    case 53 :
                        $('button#memoRate5').click();
                    break;
                }
            }
        },
		cycleCarousel: function(ev) {
		this.collection.fetch();
		ev.preventDefault();
		console.log($(ev.currentTarget));

			if($(ev.currentTarget).hasClass("left")) {
				this.$el.find(":first-child").carousel("prev");
			} else if($(ev.currentTarget).hasClass("right")) {
				this.$el.find(":first-child").carousel("next");
			}
		},
		showModal: function(ev) {
			ev.preventDefault();

			this.showPictureModal(ev);
		},
		showAnswer: function(ev) {

			ev.preventDefault();
			this.$el.find("div.cardcontent-back").show();
			this.$el.find("div.rating-controls").show();
			this.$el.find("button.show-answer").addClass("disabled");

			if(this.collection.length !== 0) {
				var cardId = $("div.item.active").children(".twosided").attr("data-id");
				var actualCard = this.collection.get(cardId);

				if($("div.item.active").hasClass('active')){
					if(actualCard.get('back').picture){
						this.$el.find("a.cardcontent-back").show();
					}
				}
			}
		},
		rateAnswer: function(ev) {
			var rating = _.escape($(ev.currentTarget).attr("data-id"));
			console.log(rating);
			var items = this.$el.find("div.item").length;
			var cardId = this.$el.find("div.item.active").children(".twosided").attr("data-id");
			console.log(this.$el.find("div.item.active").children(".twosided"));
			var that = this;

			var lastActiveItem = this.$el.find("div.item").index(this.$el.find("div.item.active"));
			App.on("cardModel:saved", function(val){
				that.$el.find("div.item").removeClass("active");
				var activeCard = that.$el.find("div.item").get(lastActiveItem);
				$(activeCard).addClass("active");
			})

			//perscard holen/anlegen
			var model = this.collection.get(cardId);
			var persCard;
			var type;

			if(!_.isEmpty(model.get("persCard"))) {
				if(_.isArray(model.get("persCard"))) {
					persCard = _.first(model.get("persCard"));
				} else {
					persCard = model.get("persCard");
				}
				persCard.value.last_rated = rating;
				model['persCard'] = persCard;
				model.set({persCard: persCard});
				type = 'put';
				console.log("vorhandene perscard");
			} else {
					persCard = {};
					persCard.value = {
					   "cardId": cardId,
					   "last_rated": rating
					}
					model['persCard'] = persCard;
					model.set({persCard: persCard});
					type = 'post';
					console.log("neue perscard", persCard);
			}
			//speichern
			console.log("save");
			model.save({}, {
				type: type,
				success: function(){
					console.log("success" + cardId);

					that.$el.find("div.cardcontent-back").hide();
					that.$el.find("div.rating-controls").hide();
					that.$el.find("button.show-answer").removeClass("disabled");

					if(items >= 1) {
						if(parseInt(rating) >= 4){
							console.log("remove card");
							console.log("collectionlength" + that.collection.length)
							that.collection.remove(that.collection.get(cardId));
						} else {
							App.trigger("cardModel:saved");
							that.$el.find(":first-child").carousel("next");
						}
					} else {
						App.trigger("cardModel:saved");
						that.$el.find("div.carousel").hide();
						that.$el.find("button.show-answer").hide();
						that.$el.find("div.memo-endscreen").show();
					}
				}
			});

			this.collection.on("remove", function(model, collection, options) {
				console.log("index: " + JSON.stringify(options));

				if(options.index+1 > that.collection.length){
					var activeCard = that.$el.find("div.item").get(0);
					$(activeCard).addClass("active");
				} else {
					var activeCard = that.$el.find("div.item").get(options.index);
					$(activeCard).addClass("active");
				}

				if(that.collection.length == 0) {
						that.$el.find("div.carousel").hide();
						that.$el.find("button.show-answer").hide();
						that.$el.find("div.memo-endscreen").show();
				}

			});
		},
		showPictureModal: function(ev) {
			var cardId = $("div.item.active").children(".twosided").attr("data-id");
			var actualCard = this.collection.get(cardId);
			var cardContent = null;

			if($(ev.currentTarget).hasClass("cardcontent-front")) {
				cardContent = actualCard.get("front");
			} else if($(ev.currentTarget).hasClass("cardcontent-back")) {
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
		checkForPicture: function(ev) {

			if(this.collection.length !== 0) {
				var cardId = $("div.item.active").children(".twosided").attr("data-id");
				var actualCard = this.collection.get(cardId);

				if($("div.item.active").hasClass('active')){
					this.$el.find("a.cardcontent-back").hide();

					if(actualCard.get('front').picture){
						this.$el.find("a.cardcontent-front").show();
					} else {
						this.$el.find("a.cardcontent-front").hide();
					}
				}
			}
		},
		/*initialize: function() {

		},*/
		onRender: function() {
			i18ninit();

			var that = this;

			$("div.learn-startscreen").hide();
			$("div.memo-endscreen").hide();
			$("div.carousel").show();

			this.$el.find("div.item").first().addClass("active");
			if (this.collection.length != 0) {
				this.$el.find("button.show-answer").show();
			}

			this.$el.find(':first-child').carousel({ interval: false });

			this.$el.find(':first-child').on('slid.bs.carousel', function (ev) {
				ev.stopPropagation();
				if($(ev.target).hasClass( "carousel" )) {
					that.checkForPicture();
				}
			});

			this.$el.find(".rate-answer").tooltip();
			this.$el.find("a.memo-helptext").popover();


			var card = this.$el.find("div.item").children(".twosided");
			if(this.collection.length !== 0) {
				var cardId = card.attr("data-id");
				console.log(cardId);
				var actualCard = this.collection.get(cardId);
				if(actualCard.get('front').picture){
					this.$el.find("a.cardcontent-front").show();
				}
			}
			card.find("div span.setname").text(this.model.get("name"));
		},
		onShow: function() {
			$('code').each(function(i, e) {hljs.highlightBlock(e)});
			MathJax.Hub.Queue(["Typeset", MathJax.Hub, this.el]);
		}
	});
});

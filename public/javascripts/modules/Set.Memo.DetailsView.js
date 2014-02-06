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
		}
	});	
	Memo.EmptyView = Backbone.Marionette.ItemView.extend({
		template: "#set-memo-item-empty",
		className: "empty-item"
	});

	Memo.DetailsView = Backbone.Marionette.CompositeView.extend({
		emptyView: Memo.EmptyView,
		itemView: Memo.ItemView,
		itemViewContainer: "div.carousel-inner",
		template: "#set-memo-collection",
		ui: {
			modalView: "#pictureModalMemo"
		},
		events: {
			"click button.show-answer": "showAnswer",
			"click button.rate-answer": "rateAnswer",
			"click a.btn-showPictureModal": "showModal",
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
					if(actualCard.get('back').picture !== null){
						this.$el.find("a.cardcontent-back").show();
					}
				}
			}	
		},
		rateAnswer: function(ev) {
			var rating = ev.target.title;
			var items = this.$el.find("div.item").length;
			var cardId = this.$el.find("div.item.active").children(".twosided").attr("data-id");
			console.log(cardId);
			var that = this;

			var lastActiveItem = this.$el.find("div.item").index(this.$el.find("div.item.active"));
			console.log(lastActiveItem);
			App.on("cardModel:saved", function(val){				
				that.$el.find("div.item").removeClass("active");
				var activeCard = that.$el.find("div.item").get(lastActiveItem);
				$(activeCard).addClass("active");
			})

			//perscard holen/anlegen
			var model = this.collection.get(cardId);
			console.log("model", model);
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

					if(parseInt(rating) >= 4){
						console.log("remove card");
						that.collection.remove(that.collection.get(cardId));
					}					
					that.$el.find("div.cardcontent-back").hide();
					that.$el.find("div.rating-controls").hide();
					that.$el.find("button.show-answer").removeClass("disabled");

					if(items > 1) {
						App.trigger("cardModel:saved");
						that.$el.find(":first-child").carousel("next");					
					} else {
						App.trigger("cardModel:saved");
						that.$el.find("div.carousel").hide();
						that.$el.find("button.show-answer").hide();
						that.$el.find("div.learn-endscreen").show();
					}
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
			imgElem.attr('title', cardContent.text);
			imgElem.attr('alt', cardContent.text);
			imgElem.attr('width', "538px");

			$("#setdetails-pictureModal-body").empty();
			$("#setdetails-pictureModal-body").append(imgElem);

			this.ui.modalView.modal('show');
		},
		checkForPicture: function(ev) {

			if(this.collection.length !== 0) {
				var cardId = $("div.item.active").children(".twosided").attr("data-id");
				var actualCard = this.collection.get(cardId);

				console.log("check picture" + cardId);

				if($("div.item.active").hasClass('active')){
					this.$el.find("a.cardcontent-back").hide();
					
					if(actualCard.get('front').picture !== null){
						this.$el.find("a.cardcontent-front").show();
					} else {
						this.$el.find("a.cardcontent-front").hide();
					}
				}	
			}
		},
		initialize: function() {

		},
		onRender: function() {	
			var that = this;

			$("div.learn-startscreen").hide();
			$("div.learn-endscreen").hide();
			$("div.carousel").show();

			this.$el.find("div.item").first().addClass("active");
			if (this.collection.length != 0) {
				this.$el.find("button.show-answer").show();
			}

			this.$el.find(':first-child').carousel({ interval: false });

			this.$el.find(':first-child').on('slid.bs.carousel', function () {
				that.checkForPicture() });

			if(this.collection.length !== 0) {
				var cardId = this.$el.find("div.item").children(".twosided").attr("data-id");
				console.log(cardId);
				var actualCard = this.collection.get(cardId);
				if(actualCard.get('front').picture !== null){
					this.$el.find("a.cardcontent-front").show();
				}		
			}
		}
	});
});
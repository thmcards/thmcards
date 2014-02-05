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
		events: {
			"click button.show-answer": "showAnswer",
			"click button.rate-answer": "rateAnswer"
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
		showAnswer: function(ev) {
			
			ev.preventDefault();
			this.$el.find("div.cardcontent-back").show();
			this.$el.find("div.rating-controls").show();
			this.$el.find("button.show-answer").addClass("disabled");


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
		initialize: function() {

		},
		onRender: function() {	
			$("div.learn-startscreen").hide();
			$("div.learn-endscreen").hide();
			$("div.carousel").show();


			this.$el.find("div.item").first().addClass("active");
			if (this.collection.length != 0) {
				this.$el.find("button.show-answer").show();
			}

			this.$el.find(':first-child').carousel({ interval: false });
		}
	});
});
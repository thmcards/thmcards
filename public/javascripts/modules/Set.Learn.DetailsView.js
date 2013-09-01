Cards.module('Set.Learn', function(Learn, App) {
	Learn.ItemView = Backbone.Marionette.ItemView.extend({
		template: "#set-learn-item",
		className: "item",
		events: {
			"click a": "linkClicked",
			"click div.box": "cardClicked"
		},
		cardClicked: function(ev) {
			ev.preventDefault();

			var front = $(ev.currentTarget).find('div.front');
			var back = $(ev.currentTarget).find('div.back');

			front.toggle();
			back.toggle();
		},
		linkClicked: function(ev) {
			ev.preventDefault();
			console.log("link");
			
			//App.trigger("set:details", this.model.get("name").replace(/[^a-zA-Z0-9-_]/g, '_'), this.model.get("id"));
		}
	});	
	Learn.EmptyView = Backbone.Marionette.ItemView.extend({
		template: "#set-learn-item-empty",
		className: "empty-item"
	});

	Learn.DetailsView = Backbone.Marionette.CompositeView.extend({
		emptyView: Learn.EmptyView,
		itemView: Learn.ItemView,
		itemViewContainer: "div.carousel-inner",
		template: "#set-learn-collection",
		events: {
			"click a.carousel-control": "cycleCarousel",
			"click button.card-success": "cardSuccess",
			"click button.card-fail": "cardFail"
		},
		cycleCarousel: function(ev) {
		ev.preventDefault();
		console.log($(ev.currentTarget));

			if($(ev.currentTarget).hasClass("left")) {
				this.$el.find(":first-child").carousel("prev");
			} else if($(ev.currentTarget).hasClass("right")) {
				this.$el.find(":first-child").carousel("next");
			}
		},
		giveAnswer: function(ev) {
		ev.preventDefault();


			if($(ev.currentTarget).hasClass("left")) {
				this.$el.find(":first-child").carousel("prev");
			} else if($(ev.currentTarget).hasClass("right")) {
				this.$el.find(":first-child").carousel("next");
			}

		},
		cardSuccess: function(ev) {
			var cardId = $("div.item.active").children(".box").attr("data-id");
			var model = this.collection.get(cardId);

			var boxId;
			if(model.has("persCard")) {
				var persCard;
				if(_.isArray(model.get("persCard"))) {
					persCard = _.first(model.get("persCard"));
				} else {
					persCard = model.get("persCard");
				}

				if(!_.isUndefined(persCard)) {
					boxId = persCard.value.box;
				} else {
					boxId = 1;
				}
			} else {
				console.log("eeelse");
				boxId = 1;
			}

			if (boxId < 5) {
				boxId++;
			} else {
				boxId == 5;
			}

			this.saveCard(cardId, boxId);
		},
		cardFail: function(ev) {
			console.log("fail");
			
		},
		saveCard: function(cardId, boxId) {
			var model = this.collection.get(cardId);

			console.log("model", model);
			if(model.has("persCard")) {

				var persCard;
				if(_.isArray(model.get("persCard"))) {
					persCard = _.first(model.get("persCard"));
				} else {
					persCard = model.get("persCard");
				}
				if(!_.isUndefined(persCard)) {
					persCard.value.box = boxId;	
					model['persCard'] = persCard;
					model.set({persCard: persCard});
				} else {
					persCard = {};
					persCard.value = {
					   "cardId": cardId,
					   "box": boxId
					}
					model['persCard'] = persCard;
					model.set({persCard: persCard});
				}
			} else {
				console.log("passiert das hier überhaupt?!");
			}

			model.save().then(function(){
				App.trigger("filter:box", boxId);
			});

		},

		initialize: function() {
			var that = this;
			App.on('filter:box', function(boxId) {
				that.filterBox(boxId);
			})
		},
		filterBox: function(boxId) {
			console.log(this.collection);
			if(boxId != null) {
				this.collection.filter(boxId);
			} else {
				this.collection.filter();
			}
			console.log(this.collection);

			this.render();
		},
		onRender: function() {
			this.$el.find("div.item").first().addClass("active");

			var pickerContainer = this.$el.find("ol.carousel-indicators").first();
			for(var i = 0; i < this.collection.length; i++) {
				var indicatorElem = $("<li></li>").attr("data-slide-to", i);
				if(i === 0) indicatorElem.addClass("active");	

				pickerContainer.append(indicatorElem);
			}

			this.$el.find(':first-child').carousel({ interval: false });
		}
	});
});
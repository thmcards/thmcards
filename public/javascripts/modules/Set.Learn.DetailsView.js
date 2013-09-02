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
			"click button.card-success": "answeredCard",
			"click button.card-fail": "answeredCard"
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
		answeredCard: function(ev) {
			if (ev.target.title === "success") {
				var failed = false;
			} else {
				var failed = true;
			}
			//cardid holen
			var cardId = $("div.item.active").children(".box").attr("data-id");

			//anzahl items im aktuellen fach
			var items = this.$el.find("div.item").length;

			//zuletzt aktive lernkarte
			var lastActiveItem = this.$el.find("div.item").index(this.$el.find("div.item.active"));




			//boxid aus personalcard holen wenn vorhanden, ansonsten boxid initial auf 1
			var model = this.collection.get(cardId);
			if(!_.isEmpty(model.get("persCard"))) {
				var persCard;
				if(_.isArray(model.get("persCard"))) {
					persCard = _.first(model.get("persCard"));
				} else {
					persCard = model.get("persCard");
				}
				var boxId = persCard.value.box;
			} else {
				var boxId = 1;
			}

			if (failed) {
				if (boxId === 1) {
					if(items > 1) {
						this.$el.find(":first-child").carousel("next");	
					}
				} else {		
					//aufruf zum speichern der lernkarte, wenn mehr als eine lernkarte vorher zur nächsten lernkarte wechseln
					if(items > 1) {
						this.$el.find(":first-child").carousel("next");				
						var that = this;
						this.$el.find(":first-child").on('slid.bs.carousel', function () {
				  				that.saveCard(cardId, boxId, failed);
				  				that.$el.find("div.item");
							})				
					} else {
						this.saveCard(cardId, boxId, failed);
					}

				}
			}

			if (!failed) {
				if (boxId === 5) {
					if(items > 1) {
						this.$el.find(":first-child").carousel("next");	
					}
				} else {		
					//aufruf zum speichern der lernkarte, wenn mehr als eine lernkarte vorher zur nächsten lernkarte wechseln
					if(items > 1) {
						this.$el.find(":first-child").carousel("next");				
						var that = this;
						this.$el.find(":first-child").on('slid.bs.carousel', function () {
				  				that.saveCard(cardId, boxId, failed);
				  				var activeCard = that.$el.find("div.item").get(lastActiveItem);
								$(activeCard).addClass("active");
							})				
					} else {
						this.saveCard(cardId, boxId, failed);
					}

				}
			}

		},
		saveCard: function(cardId, boxId, failed) {
			//boxid des aktuellen fachs
			var actualBox = boxId;

			//wenn falsch beantwortet
			if (failed) {
				//zurück in box1
				boxId = 1;
			//wenn richtig beantwortet
			} else {
				//boxid erhöhen wenn nicht schon in box5
				if (boxId < 5) {
					boxId++;
				} else {boxId = 5;}
			}

			//perscard holen/anlegen und mit neuer boxid aktualisieren
			var model = this.collection.get(cardId);
			var persCard;
			if(!_.isEmpty(model.get("persCard"))) {	
				if(_.isArray(model.get("persCard"))) {
					persCard = _.first(model.get("persCard"));
				} else {
					persCard = model.get("persCard");
				}
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
			//speichern und in aktueller box bleiben
			model.save().then(function(){
				App.trigger("filter:box", actualBox);
			});
		},
		initialize: function() {
			var that = this;
			App.on('filter:box', function(boxId) {
				that.filterBox(boxId);
			})
		},
		filterBox: function(boxId) {
			if(boxId != null) {
				this.collection.filter(boxId);
			} else {
				this.collection.filter();
			}
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
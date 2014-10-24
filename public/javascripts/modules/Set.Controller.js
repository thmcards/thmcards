Cards.module('Set', function(Set, App){
	Set.Controller = {
		showListLayout: function(fieldname, direction){
		    
			var setLayout = new Cards.Set.List.Layout();
			Cards.mainRegion.show(setLayout);
           
            if(!fieldname){
                fieldname = "name";
            }
            if(!direction){
                direction = "down";
            }
                                          
            var sets = new Cards.Entities.SetCollection();            
            sets.sortByField(fieldname, direction);            
                                                               
			var listView = new Cards.Set.List.ListView({ collection: sets });			
            setLayout.listRegion.show(listView);			
                       
			var sideBarView = new Cards.Set.List.SideBar.SideBarView({ collection: sets });
			setLayout.sideBarRegion.show(sideBarView);
		},
		showDetailsLayout: function(id){            			
            var set = new Cards.Entities.Set({id: id});
			set.fetch({
				success: function(){
					var detailsLayout = new Cards.Set.Details.Layout();
					Cards.mainRegion.show(detailsLayout);

					var cardCollection = new Cards.Entities.CardCollection([], { setId: set.get("id") });

					cardCollection.fetch({
						success: function(){
							var detailsView = new Cards.Set.Details.DetailsView({ collection: cardCollection, model: set });
							detailsLayout.detailsRegion.show(detailsView);

							if(set.get("rating") === true) {
								$.get("/rating/avg/"+set.get("id"), function(data){
									var rating = new Cards.Entities.Rating(data);
									var ratingsView = new Cards.Set.Details.SideBar.RatingsView({ model: rating});
									detailsLayout.ratingRegion.show(ratingsView);
								});
							}
						},
						error: function(){

						}
					});
					var sideBarView = new Cards.Set.Details.SideBar.SideBarView({ model: set});
					detailsLayout.sideBarRegion.show(sideBarView);

					if(set.get("owner") === $.parseJSON($.cookie('usr')).username) {
						var constrolsView = new Cards.Set.Details.SideBar.ControlsView({ model: set});
						detailsLayout.controlsRegion.show(constrolsView);
					}
				},
				error: function(){
					console.log("error");
				}
			});
		},
		showDetailsListLayout: function(id, side, direction){                        
			var set = new Cards.Entities.Set({id: id});
			set.fetch({
				success: function(){
					var detailsLayout = new Cards.Set.Details.Layout();
					Cards.mainRegion.show(detailsLayout);

                    if(!side){
                       side = "front";
                    }
                    if(!direction){
                        direction = "down";
                    }

					var cardCollection = new Cards.Entities.CardCollection([], { setId: set.get("id") });
                    cardCollection.sortByField(side, direction);
                    
					cardCollection.fetch({
						success: function(){
							var detailsListView = new Cards.Set.Details.DetailsListView({ collection: cardCollection, model: set });
							detailsLayout.detailsRegion.show(detailsListView);

							if(set.get("rating") === true) {
								$.get("/rating/avg/"+set.get("id"), function(data){
									var rating = new Cards.Entities.Rating(data);
									var ratingsView = new Cards.Set.Details.SideBar.RatingsView({ model: rating});
									detailsLayout.ratingRegion.show(ratingsView);
								});
							}
						},
						error: function(){

						}
					});
					var sideBarView = new Cards.Set.Details.SideBar.SideBarView({ model: set});
					detailsLayout.sideBarRegion.show(sideBarView);

					if(set.get("owner") === $.parseJSON($.cookie('usr')).username) {
						var constrolsView = new Cards.Set.Details.SideBar.ControlsView({ model: set});
						detailsLayout.controlsRegion.show(constrolsView);
					}
				},
				error: function(){
					console.log("error");
				}
			});
		},
		sortSetDetailsLayout: function(side, direction){                        
            this.showDetailsListLayout(window.location.hash.split("/").pop(), side, direction);
        },
		showLearnLayout: function(id){
			var set = new Cards.Entities.Set({id: id});
			set.fetch({
				success: function(){
					var learnLayout = new Cards.Set.Learn.Layout();
					Cards.mainRegion.show(learnLayout);

					var personalCollection = new Cards.Entities.PersonalCollection([], { setId: set.get("id") });

					personalCollection.fetch({
						success: function(){
							// copy mit filterfunktion der original liste, die wird angezeigt
							var filteredCollection = FilteredCollection(personalCollection, { setId: set.get("id") });

							var learnView = new Cards.Set.Learn.DetailsView({ collection: filteredCollection });
							learnLayout.learnRegion.show(learnView);


							var controlsView = new Cards.Set.Learn.SideBar.ControlsView({ collection: personalCollection });
							learnLayout.controlsRegion.show(controlsView);

							var sideBarView = new Cards.Set.Learn.SideBar.SideBarView({ model: set });
							learnLayout.sideBarRegion.show(sideBarView);
						},
						error: function(){

						}
					});
				},
				error: function(){
					console.log("error");
				}
			});
		},
		showMemoLayout: function(id){
			var set = new Cards.Entities.Set({id: id});
			set.fetch({
				success: function(){
					var memoLayout = new Cards.Set.Memo.Layout();
					Cards.mainRegion.show(memoLayout);

					var personalCollection = new Cards.Entities.PersonalCollection([], { setId: set.get("id"), url:"/set/" + set.get("id") + "/memo/card" });

					personalCollection.fetch({
						success: function(){

							var memoView = new Cards.Set.Memo.DetailsView({collection: personalCollection , model: set});
							memoLayout.detailsRegion.show(memoView);
						},
						error: function(){

						}
					});
				},
				error: function(){
					console.log("error");
				}
			});
		},
		showDetailsNewCardLayout: function(id){
			var set = new Cards.Entities.Set({id: id});

			set.fetch({
				success: function(){
					console.log(set.get("id"));

					var newCardLayout = new Cards.Set.Details.NewCardLayout();
					Cards.mainRegion.show(newCardLayout);

					var newCardView = new Cards.Set.Details.NewCardView({ model: set });
					newCardLayout.detailsRegion.show(newCardView);

				},
				error: function(){
					console.log("error");
				}
			});
		},
		showDetailsEditCardLayout: function(id){
			Cards.LAST_VIEWED_OR_MODIFIED_CARD_ID = id;
			var card = new Cards.Entities.Card({_id: id});
			console.log("cardid" + id);

			card.fetch({
				success: function(){

					var editCardLayout = new Cards.Set.Details.EditCardLayout();
					Cards.mainRegion.show(editCardLayout);

					var editCardView = new Cards.Set.Details.EditCardView({ model: card });
					editCardLayout.detailsRegion.show(editCardView);

				},
				error: function(){
					console.log("error");
				}
			});
		},
		showRatingLayout: function(id) {
			var set = new Cards.Entities.Set({id: id});

			set.fetch({
				success: function(set){

				var detailsLayout = new Cards.Set.Details.Layout();
				Cards.mainRegion.show(detailsLayout);

				var ratingCollection = new Cards.Entities.RatingCollection([], {setId: id});

				ratingCollection.fetch({
					success: function(ratingCollection){
						var ratingView = new Cards.Set.Rating.RatingView({ collection: ratingCollection });
						console.log(ratingCollection);
						detailsLayout.detailsRegion.show(ratingView);
					},
					error: function() {

					}
				})

				var sideBarView = new Cards.Set.Rating.SideBarView({ model: set});
				detailsLayout.sideBarRegion.show(sideBarView);
				},
				error: function(){

				}
			});
		},
		onRender: function(){
			i18ninit();
		}
	}
});

function FilteredCollection(collection, options){
    var filtered = new collection.constructor(collection.models, options);
    filtered.filter = function(criteria){
        var items;
        if (criteria){
            items = _.filter(collection.models, function(model) {
            	var persCard = model.get("persCard");
            	var pcard;
            	if(_.isArray(persCard)) {
            		pcard = _.first(model.get("persCard"));
            	} else {
            		pcard = model.get("persCard");
            	}

				if (pcard) {
           			return pcard.value.box == criteria;
           		} else {
           			console.log("no card");
           		}
           		if (_.isUndefined(pcard) && criteria == 1){
           			return true;
           		}
           		else return false;

			});
        } else {
            items = collection.models;
        }
        filtered.reset(items);
    };
    collection.on("change", function(model){
        filtered.reset(collection.models);
    });
    collection.on("reset", function(){
        filtered.reset(collection.models);
    });
    return filtered;
}

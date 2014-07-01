Cards.module("Set.List.SideBar", function(SideBar, App) {
	SideBar.SideBarView = Backbone.Marionette.ItemView.extend({
		template: "#set-list-sideBar",
		className: "well well-sm sidebar-nav",
		ui: {
			btnAdd: "a.saveSet",
			inputSetName: "input[type=text]",
			modalView: "#newSetModal",
			modalBtnSave: "#newSetModal button.btn-primary",
			modalInputName: "#newSetName",
			modalInputDescription: "#newSetDescription",
			modalInputCategory: "#newSetCategory"
		},
		events: {
			"click a.saveSet": "showSetModal",
			"click #newSetModal button.btn-primary": "saveSet",
			"click ul.nav-list a": "categoryClicked",
			"click button.saveSet": "showModal",
			"keyup input[type=text]": "onKeypress"
		},
		onKeypress: function(ev) {
			var ENTER_KEY = 13;

			if(ev.which === ENTER_KEY && $("#new-set-input").is(":focus")) {
				this.showSetModal();
			}
		},
		showModal: function(ev) {
			ev.preventDefault();

			this.showSetModal();
		},
		categoryClicked: function(ev) {
			ev.preventDefault();

			$(ev.currentTarget).parent().siblings().removeClass('active');
			$(ev.currentTarget).parent().addClass('active');

			if(ev.currentTarget.name === 'set-created') {
				this.collection.fetch({ reset:true });
			} else if(ev.currentTarget.name === 'set-learned') {
				var that = this;
				var learnedCollection = new Cards.Entities.SetLearnedCollection().fetch({
					success: function(collection) {
						that.collection.reset(collection.models, { learned: true });
					}
				});
			}
		},
		showSetModal: function() {
			var that = this;

			var newSetName = this.ui.inputSetName.val().trim();
			this.ui.inputSetName.val('');
			var newSet = new Cards.Entities.Set({ name: newSetName, created: new Date().getTime(), count: Math.round(Math.random()*50) });

			this.ui.modalView.on('show.bs.modal', function () {
    			that.ui.modalInputName.val(newSetName);
			});
			this.ui.modalView.on('shown.bs.modal', function () {
				if(newSetName == "") {
					that.ui.modalInputName.focus();
				} else {
					that.ui.modalInputDescription.focus();
				}
			});
			this.ui.modalView.on('hidden.bs.modal', function() {
				that.ui.modalBtnSave.button('reset');
				that.ui.modalInputName.val('');
				that.ui.modalInputDescription.val('');
				that.$('.help-block').text('');
				that.$('.setdetails').removeClass('has-error');
			})
			this.ui.modalView.modal('show');
		},
		saveSet: function(ev) {
			var that = this;

			this.ui.modalBtnSave.button('loading');

			var name = _.escape(this.ui.modalInputName.val());
			var description = _.escape(this.ui.modalInputDescription.val());
			var category = _.escape(this.ui.modalInputCategory.val());
			var visibility = _.escape($("#newSetModal .btn-group > label.active > input").val());
			var rating = _.escape($("#newSetModal .btn-group-rating > label.active > input").val());

			var newSet = new Cards.Entities.Set({
								name: name,
								description: description,
								visibility: visibility,
								category: category,
								cardCnt: 0,
								rating: rating
							 });

			if(newSet.isValid()) {
				this.collection.create(newSet, {
				    wait : true,
				    success : function(resp){
				        that.ui.modalView.modal('hide');
				    },
				    error : function(err) {
				    	that.ui.modalBtnSave.button('reset');
					}
				});
			} else {
				this.showErrors(newSet.validationError);
				this.ui.modalBtnSave.button('reset');
			}
		},
		showErrors: function(errors) {
			this.$('.help-block').text('');
			this.$('.setdetails').removeClass('has-error');
		    _.each(errors, function (error) {
		        var cardside = this.$('div.' + error.name);
		        cardside.addClass('has-error');
		        var helptext = this.$('span.' + error.name);
		        helptext.text(error.message);
		    }, this);
		},

		hideErrors: function () {
			this.$('.help-block').text('');
			this.$('.setdetails').removeClass('has-error');
		},
		initialize: function(options) {
			this.collection = options.collection;
		},
		onShow: function(){

			$('#newSetCategory').typeahead({
				name: 'category',
				remote:  '/typeahead/set/category?q=%QUERY',
				prefetch: '/typeahead/set/category'/*,
				footer: "<hr />",
				template: [
				  '<p class="typeahead-name"><%= value %> <span>Kategorie</span></p>',
				  '<p class="typeahead-description"><%= count %> <% if(count > 1) { %> Kartensätze <% } else { %>Kartensatz<% } %></p>'
				].join(''),
				engine: engine */
			});
		},
		onRender: function(){
			i18ninit();
		}
	});
});

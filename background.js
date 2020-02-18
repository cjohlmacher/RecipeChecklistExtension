
//Page Action onClick - Needed since pop-up is not called out in Manifest
chrome.pageAction.onClicked.addListener(function(tab) {
	console.log("recipe icon clicked!");
	chrome.pageAction.setPopup(
		{
			tabId: tab.id, 
			popup: "order.html"
		});
});

//Initialize ingredient list prepopulated with an empty array for user's custom ingredients.
var ingredientList = {};
ingredientList[["Your Additional Ingredients","000",3]] = [];


//Add listener to handle messages coming from content page and popup page
chrome.runtime.onMessage.addListener(function(response, sender, sendResponse) {  
	
	//Initialize tab information based off message sender
	if (sender.tab !== undefined) {
		tabId = sender.tab.id.toString();
		tabIdSize = tabId.length;
		tabTitle = sender.tab.title;
		tabKey = [tabTitle,tabId,tabIdSize];
		chrome.pageAction.show(sender.tab.id);
	} else if (response.length > 2) {
		tabId = response[2]
		tabIdSize = tabId.length;
		tabTitle = response[3];
		tabKey = [tabTitle,tabId,tabIdSize];
	};

	//Case handling for message content:
	if (response[0] === "newItem") {   //Checks if tab exists in dictionary already and creates new dictionary key if tab is new.
		console.log(response[1]);
		if (ingredientList[tabKey] === undefined) {
			ingredientList[tabKey] = []
			ingredientList[tabKey].push(response[1])
		} else if (ingredientList[tabKey].includes(response[1])) { 
			//For tab refresh: removes existing ingredients so that ingredient order is synced between recipe checklist and page content.
			var ingredientIndex = ingredientList[tabKey].indexOf(response[1]);
			if (ingredientIndex !== -1) {
				ingredientList[tabKey].splice(ingredientIndex,1);
			}
			ingredientList[tabKey].push(response[1]);
		} else {    //Adds ingredient to a tab's existing ingredient list.
			ingredientList[tabKey].push(response[1])
		}
	} else if (response[0] === "clickOn") {   //Remove item from tab's ingredient list if checkbox is clicked inside content page.
		var ingredientIndex = ingredientList[tabKey].indexOf(response[1]);
		if (ingredientIndex !== -1) {
			ingredientList[tabKey].splice(ingredientIndex,1);
		}
	} else if (response[0] === "clickOff") {   //Add item to tab's ingredient list if checkbox is clicked off inside content page.
		if (ingredientList[tabKey] === undefined) {
			ingredientList[tabKey] = []
			ingredientList[tabKey].push(response[1])
		} else {
			ingredientList[tabKey].push(response[1])
		}
	} else if (response[0] === "removeRecipe") {   //Delete entire tab from ingredient list.
		console.log(response[1]);
		delete ingredientList[response[1]];
	} else {  //i.e. InitializeTab
	};
});

import { LightningElement, wire, api  } from 'lwc';
import { getRecord, getFieldValue, updateRecord } from "lightning/uiRecordApi";
import getToken from '@salesforce/apex/MicrosoftAuthentication.getToken';
import SHAREPOINT_FOLDER_ID from '@salesforce/schema/Opportunity.Sharepoint_Folder_Id__c';
import OPP_NAME from '@salesforce/schema/Opportunity.Name';
import ID_FIELD from "@salesforce/schema/Opportunity.Id";


export default class SpExplorerRecord extends LightningElement {
    @api recordId
    someData = [];
    accessToken;

    parentDirectory;
    currentFolderId;
    hasFolderId = false;
    folderId;
    @wire(getRecord, {recordId:"$recordId", fields: [SHAREPOINT_FOLDER_ID, OPP_NAME]})
    getFolderId({error, data}){
        if(data){
            this.folderId = getFieldValue(data, SHAREPOINT_FOLDER_ID);
            this.oppName = getFieldValue(data, OPP_NAME);
            console.log('Folder Id')
            this.getAccessToken(this.folderId);
            if(this.folderId != null){
                this.currentFolderId = this.folderId;
                this.hasFolderId = true;
                
            }
            
        }
    }

    get showBackButton(){
        return this.folderId == this.currentFolderId;
    }

    datatableColumns = [
        {label: 'Name', type:'customName', typeAttributes: {isFolder: {fieldName: 'isFolder'}, folderName: {fieldName: 'name'}, fileId:{fieldName:'id'}, eTag: {fieldName: 'eTag'}}},
        {label: 'Created By', fieldName:'createdBy'},
        {label: 'Created DateTime', fieldName:'createdDateTime'},
        {label: 'Actions', type:'customActionNew',
            typeAttributes:{recId:{fieldName:'name'}, fileId:{fieldName:'id'}, eTag: {fieldName: 'eTag'}}
        }
    ]

    filesToUpload = [];
    connectedCallback(){
        //this.getAccessToken();
        //this.processData();
    }
    
    handleFileClick(event){
        console.log(event.detail.fileFolderObj.folderName);
        var isFolder = event.detail.fileFolderObj.folderType;
        var folderId = event.detail.fileFolderObj.fileId;
        console.log(event.detail.fileFolderObj.fileId);
        console.log(event.detail.fileFolderObj.eTag);
        console.log(event.detail.fileFolderObj.folderType);
        if(isFolder){
          this.getSpecificFolderData(folderId);
        }else{
          this.downloadFile(folderId);
        }
        
    }
    getAccessToken(folderId){
      getToken()
      .then(token => {
        console.log('Token ' + token);
        this.accessToken = token;
        if(folderId != null){
            this.getSpecificFolderData(folderId);
        }
        
      })
    }

    handleBackClick(event){
      
      this.requestParentFolder(this.currentFolderId);
      
    }
    getFolderData(token){
      var url = 'https://graph.microsoft.com/v1.0/drives/b%21CVdKX821UEuzn-l9uZHsxjwMwyQd-g9CsMkaI8vhpxP39bNWl7NLQa626medTHBO/root/children';
        var headers = {
          'Authorization': 'Bearer '+ token
        };

        fetch(url, {
          method: 'GET',
          headers: headers
        })
        .then(response => {
          if (!response.ok) {
            return 'ERROR';
          }
          return response.json();
        })
        .then(data => {
          if(data == 'ERROR'){
            return;
          }
          this.processFolderData(data);
          
        })
        .catch(error => {
          console.error('Fetch Error:', error);
        });
    }

    getSpecificFolderData(folderId){
      this.currentFolderId = folderId;
      var url = 'https://graph.microsoft.com/v1.0/drives/b%21CVdKX821UEuzn-l9uZHsxjwMwyQd-g9CsMkaI8vhpxP39bNWl7NLQa626medTHBO/items/' + folderId +'/children';
      var headers = {
        'Authorization': 'Bearer '+ this.accessToken
      };

      fetch(url, {
        method: 'GET',
        headers: headers
      })
      .then(response => {
        if (!response.ok) {
          return 'ERROR';
        }
        return response.json();
      })
      .then(data => {
        if(data == 'ERROR'){
          return;
        }
        this.processFolderData(data);
        
      })
      .catch(error => {
        console.error('Fetch Error:', error);
      });
    }

    processFolderData(data){
      var finalData = [];
      console.log('Response:', data);
      var pd = [];
      data.value.forEach(file => {
        var dataObj = {};
        dataObj.createdBy = file.createdBy.user.displayName;
        dataObj.createdDateTime =file.createdDateTime;
        dataObj.name = file.name;
        dataObj.isFolder = file.folder == undefined || file.folder==null ? false: true;
        dataObj.id = file.id;
        dataObj.eTag = file.eTag;
        this.parentDirectory = file.parentReference.id;
        finalData.push(dataObj);
        
      })
      
      this.someData = finalData;
    }

    downloadFile(fileId){
      var url = 'https://graph.microsoft.com/v1.0/drives/b%21CVdKX821UEuzn-l9uZHsxjwMwyQd-g9CsMkaI8vhpxP39bNWl7NLQa626medTHBO/items/' + fileId +'?select=id,@microsoft.graph.downloadUrl';
      var headers = {
        'Authorization': 'Bearer '+ this.accessToken
      };

      fetch(url, {
        method: 'GET',
        headers: headers
      })
      .then(response => {
        if (!response.ok) {
          return 'ERROR';
        }
        return response.json();
      })
      .then(data => {
        if(data == 'ERROR'){
          return;
        }
        window.open(data['@microsoft.graph.downloadUrl']);
      })
      .catch(error => {
        console.error('Fetch Error:', error);
      });

      
    }

    requestParentFolder(currentId){
      console.log('Cur Id ' + currentId);
      var url = 'https://graph.microsoft.com/v1.0/drives/b%21CVdKX821UEuzn-l9uZHsxjwMwyQd-g9CsMkaI8vhpxP39bNWl7NLQa626medTHBO/items/'+currentId;
      var headers = {
        'Authorization': 'Bearer '+ this.accessToken
      };

      fetch(url, {
        method: 'GET',
        headers: headers
      })
      .then(response => {
        if (!response.ok) {
          console.log('First Check failed');
          return response.json();
        }
        return response.json();
      })
      .then(data => {
        if(data == 'ERROR'){
          console.log('Second Check failed');
          return;
        }
        console.log('PRID ', data.parentReference.id);
        if(data.parentReference.id != undefined){

          this.getSpecificFolderData(data.parentReference.id);
        }
      })
      .catch(error => {
        console.error('Fetch Error:', error);
      });
    }

    addFiles(event){
      
      console.log('Event Target ' , event.target.files);
      var files = event.target.files;

      for(let key in files){
        if(key == 'length' || key == 'item'){
            continue;
        }
        var file = files[key];
        this.filesToUpload.push(file);
        console.log('FIels ' , this.filesToUpload);
      }
    }

    uploadFiles(event){
      console.log('FIels ' , this.filesToUpload);
      this.filesToUpload.forEach(file => {
        var  formData = new FormData();
        formData.append('file', file);
        var url = 'https://graph.microsoft.com/v1.0/drives/b!CVdKX821UEuzn-l9uZHsxjwMwyQd-g9CsMkaI8vhpxP39bNWl7NLQa626medTHBO/items/' + this.currentFolderId + ':/' + file.name + ':/content';
        fetch(url, {
          method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + this.accessToken,
                // Replace YOUR_ACCESS_TOKEN with the actual access token
                'Content-Type': file.type,
            },
            body: formData,
        })
        .then(res => {
          return res.json();
        })
        .then(data => {
          console.log('Data ' + data);
          this.getSpecificFolderData(this.currentFolderId);
        })
      })
      this.filesToUpload = [];
      
      
    }

    creaetSharepointFolder(){
        const url = 'https://graph.microsoft.com/v1.0/drives/b!CVdKX821UEuzn-l9uZHsxjwMwyQd-g9CsMkaI8vhpxP39bNWl7NLQa626medTHBO/items/root/children';
        const headers = new Headers({
            'Authorization': 'Bearer ' + this.accessToken,
             'Content-Type': 'application/json'
        });

        const data = {
            name: this.oppName,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'rename'
          };

          const options = {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
          };

          fetch(url, options)
        .then(response => response.json())
        .then(result => {
            var fields = {};
            fields[ID_FIELD.fieldApiName] = this.recordId;
            fields[SHAREPOINT_FOLDER_ID.fieldApiName] = result.id;
            const recordInput = { fields };

            updateRecord(recordInput);
        })
        .catch(error => console.error('Error:', error));
    }
}
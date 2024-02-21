import { LightningElement, wire, api  } from 'lwc';
import { getRecord, getFieldValue, updateRecord } from "lightning/uiRecordApi";

import getToken from '@salesforce/apex/MicrosoftAuthentication.getToken';
import getOppFolders from '@salesforce/apex/SharePointExplorerController.getOppFolders';
import SHAREPOINT_FOLDER_ID from '@salesforce/schema/Opportunity.Sharepoint_Folder_Id__c';
import OPP_NAME from '@salesforce/schema/Opportunity.Name';
import ID_FIELD from "@salesforce/schema/Opportunity.Id";
const ERROR_MSG     = 'ERROR';
const METHOD_PUT    = 'PUT';
const METHOD_POST   = 'POST';
const METHOD_GET    = 'GET';
const BEARER_STRING = 'Bearer ';
const FILE_SELECTOR = '@microsoft.graph.downloadUrl';
const ROOT_NAME     = 'Shared Documents';

export default class SpExplorerRecord extends LightningElement {
    @api recordId
    someData = [];
    driveId;
    graphUrl;
    accessToken;
    isRoot = true;
    currentFolderId;
    hasFolderId = false;
    folderId;
    folderHeirarchy = [];
    showFileUploadModal = false;
    datatableColumns = [
      {label: 'Name', type:'customName', typeAttributes: {isFolder: {fieldName: 'isFolder'}, folderName: {fieldName: 'name'}, fileId:{fieldName:'id'}, eTag: {fieldName: 'eTag'}}},
      {label: 'Created By', fieldName:'createdBy'},
      {label: 'Created DateTime', fieldName:'createdDateTime'},
      {label: 'Actions', type:'customActionNew',
          typeAttributes:{recId:{fieldName:'name'}, fileId:{fieldName:'id'}, eTag: {fieldName: 'eTag'}}
      }
  ]

  filesToUpload = [];

    @wire(getRecord, {recordId:"$recordId", fields: [SHAREPOINT_FOLDER_ID, OPP_NAME]})
    getFolderId({error, data}){
        if(data){
            this.folderId = getFieldValue(data, SHAREPOINT_FOLDER_ID);
            this.oppName = getFieldValue(data, OPP_NAME);
            console.log('Folder Id')
            this.getAccessToken();
            if(this.folderId != null){
                this.currentFolderId = this.folderId;
                this.hasFolderId = true;
                this.folderHeirarchy.push(
                  {
                    id: this.folderId,
                    name: this.oppName,
                  }
                )
            }
            
        }
    }

    getOpportunityFolder(){
      getOppFolders({oppId: this.recordId})
      .then(res => {
        console.log(JSON.stringify(res));
        this.someData = res;
        this.showLoadingSpinner = false;
      })
      .catch(error => {
        console.log('Error ' + error);
        this.showLoadingSpinner = false;
        // Error loggin here
      })
    }

    get showBackButton(){
        return this.folderId == this.currentFolderId;
    }

    
    connectedCallback(){
        this.getOpportunityFolder();
    }
    
    handleFileClick(event){
      this.showLoadingSpinner = true;
        console.log(event.detail.fileFolderObj.folderName);
        var isFolder = event.detail.fileFolderObj.folderType;
        var folderId = event.detail.fileFolderObj.fileId;
        var folderName = event.detail.fileFolderObj.folderName;
        if(isFolder){
          this.isRoot = false;
          this.folderHeirarchy.push({
            id: folderId,
            name: folderName
          })
          this.getSpecificFolderData(folderId);
        }else{
          this.downloadFile(folderId);
        }
        
    }

    handleBackClick(event){
      this.showLoadingSpinner = true;
      console.log('Popping ');
      this.folderHeirarchy.pop();
      this.requestParentFolder(this.currentFolderId);
    }

    handleBreadCrumbClick(event){
      this.showLoadingSpinner = true;
      var lengthToKeep = Number(event.target.dataset.key) + 1;
      var folderId = event.target.dataset.id;
      console.log('Folder Id ' + folderId);
      this.folderHeirarchy.length = lengthToKeep;
      this.getSpecificFolderData(folderId);
    }


    getAccessToken(){
      getToken()
      .then(data => {
        console.log('Data ' + JSON.stringify(data));
        this.driveId = data.driveId;
        this.graphUrl = data.graphURL;
        this.accessToken = data.access_token
      })
      .catch(error => {
        this.hasErrors = true;
        this.showLoadingSpinner = false;
      })
    }

    openFileUploadModal(){
      this.showFileUploadModal = true;
    }

    closeFileUploadModal(){
      this.showFileUploadModal = false;
      this.filesToUpload = [];
      this.addedFilesNames = [];
    }

    getSpecificFolderData(folderId){
      console.log('Getting Specific Folder Data');
      this.currentFolderId = folderId;
      if(this.currentFolderId == this.folderId){
        this.getOpportunityFolder();
        return;
      }
      var url = this.graphUrl + this.driveId + '/items/' + folderId +'/children';
      var headers = {
        Authorization: BEARER_STRING+ this.accessToken
      };

      fetch(url, {
        method: METHOD_GET,
        headers: headers
      })
      .then(response => {
        if (!response.ok) {
          return ERROR_MSG;
        }
        return response.json();
      })
      .then(data => {
        if(data == ERROR_MSG){
          this.showLoadingSpinner = false;
          return;
        }
        this.processFolderData(data);
        
      })
      .catch(error => {
        console.error('Fetch Error:', error);
        this.showLoadingSpinner = false;
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
        finalData.push(dataObj);
        
      })
      
      this.someData = finalData;
      this.showLoadingSpinner = false;
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
      var url = this.graphUrl + this.driveId + '/items/' +currentId;
      var headers = {
        Authorization: BEARER_STRING+ this.accessToken
      };

      fetch(url, {
        method: METHOD_GET,
        headers: headers
      })
      .then(response => {
        if (!response.ok) {
          console.log('First Check failed');
          this.showLoadingSpinner = false;
          return response.json();
        }
        return response.json();
      })
      .then(data => {
        this.showLoadingSpinner = false;
        if(data == 'ERROR'){
          console.log('Second Check failed');
          return;
        }
        console.log('PRID ', data.parentReference.id);
        if(data.parentReference.id != undefined){
          this.getSpecificFolderData(data.parentReference.id);
        }else{
          this.isRoot = true;
        }
      })
      .catch(error => {
        console.error('Fetch Error:', error);
        this.showLoadingSpinner = false;
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
        this.addedFilesNames = [...this.addedFilesNames, file.name];
        console.log('Added Files' + this.addedFilesNames);
        this.filesToUpload.push(file);
        console.log('FIels ' , this.filesToUpload);
      }
    }

    uploadFiles(event){
      this.showFileUploadModal = false;
      this.showLoadingSpinner = true;
      console.log('FIels ' , this.filesToUpload);
      const fetchPromises = [];
      this.filesToUpload.forEach(file => {
        var  formData = new FormData();
        formData.append('file', file);
        var url = this.graphUrl + this.driveId + '/items/' + this.currentFolderId + ':/' + file.name + ':/content';
        fetchPromises.push(
          fetch(url, {
            method: METHOD_PUT,
              headers: {
                  Authorization: BEARER_STRING + this.accessToken,
                  'Content-Type': file.type,
              },
              body: formData,
          })
          .then(res => {
            return res.json();
          })
          .then(data => {
            console.log('Data ' + data);
          })
        );
      });
      Promise.all(fetchPromises)
      .then(res => {
        this.filesToUpload = [];
        this.addedFilesNames = [];
        this.getSpecificFolderData(this.currentFolderId);
      })
      
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
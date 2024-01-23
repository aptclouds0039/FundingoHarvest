import { LightningElement } from 'lwc';
import getToken from '@salesforce/apex/MicrosoftAuthentication.getToken';
const ERROR_MSG     = 'ERROR';
const METHOD_PUT    = 'PUT';
const METHOD_POST   = 'POST';
const METHOD_GET    = 'GET';
const BEARER_STRING = 'Bearer ';
export default class SpExplorer extends LightningElement {
    someData = [];
    hasErrors = false;
    driveId;
    graphUrl;
    accessToken;
    parentDirectory;
    currentFolderId = 'root';
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
        this.getAccessToken();
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
    getAccessToken(){
      getToken()
      .then(data => {
        console.log('Data ' + JSON.stringify(data));
        this.driveId = data.driveId;
        this.graphUrl = data.graphURL;
        this.accessToken = data.access_token;
        this.getFolderData();
      })
      .catch(error => {
        this.hasErrors = true;
      })
    }
 
    handleBackClick(event){
      this.requestParentFolder(this.currentFolderId);
    }
    getFolderData(){
      var url = this.graphUrl + this.driveId + '/root/children';
      var headers = {
        Authorization: BEARER_STRING + this.accessToken
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
        })
      })
      this.filesToUpload = [];
      
      
    }
}
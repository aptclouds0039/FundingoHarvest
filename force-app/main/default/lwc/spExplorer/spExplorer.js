import { LightningElement } from 'lwc';
import getToken from '@salesforce/apex/MicrosoftAuthentication.getToken';
const ERROR_MSG     = 'ERROR';
const METHOD_PUT    = 'PUT';
const METHOD_POST   = 'POST';
const METHOD_GET    = 'GET';
const BEARER_STRING = 'Bearer ';
const FILE_SELECTOR = '@microsoft.graph.downloadUrl';
const ROOT_NAME     = 'Shared Documents';
export default class SpExplorer extends LightningElement {
    someData = [];
    hasErrors = false;
    showLoadingSpinner = false;
    showFileUploadModal = false;
    driveId;
    graphUrl;
    accessToken;
    currentFolderId = 'root';
    rootId;
    isRoot = true;
    folderHeirarchy = [{
      id: 'root',
      name: 'Root',
    }]
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
      this.showLoadingSpinner = true;
      this.getAccessToken();
    }
    
    get showBackButton(){
      return this.currentFolderId == 'root' || this.currentFolderId == this.rootId; 
    }

    openFileUploadModal(){
      this.showFileUploadModal = true;
    }

    closeFileUploadModal(){
      this.showFileUploadModal = false;
    }

    handleFileClick(event){
        this.showLoadingSpinner = true;
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

    handleBreadCrumbClick(event){
      this.showLoadingSpinner = true;
      var lengthToKeep = Number(event.target.dataset.key) + 1;
      var folderId = event.target.dataset.id;
      this.folderHeirarchy.length = lengthToKeep;
      this.getSpecificFolderData(folderId);
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
        this.showLoadingSpinner = false;
      })
    }

    handleBackClick(event){
      this.showLoadingSpinner = true;
      this.folderHeirarchy.pop();
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

    getSpecificFolderData(folderId){
      
      this.currentFolderId = folderId;
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
      var runOnce = false;
      data.value.forEach(file => {
        var dataObj = {};
        dataObj.createdBy = file.createdBy.user.displayName;
        dataObj.createdDateTime =file.createdDateTime;
        dataObj.name = file.name;
        dataObj.isFolder = file.folder == undefined || file.folder==null ? false: true;
        dataObj.id = file.id;
        dataObj.eTag = file.eTag;
        if(this.currentFolderId == 'root'){
          this.rootId = file.parentReference.id;
        }
        finalData.push(dataObj);
      })
      
      this.someData = finalData;
      this.showLoadingSpinner = false;
    }

    downloadFile(fileId){
      var url = this.graphUrl + this.driveId + '/items/' + fileId +'?select=id,' + FILE_SELECTOR;
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
        window.open(data[FILE_SELECTOR]);
        this.showLoadingSpinner = false;
      })
      .catch(error => {
        console.error('Fetch Error:', error);
        this.showLoadingSpinner = false;
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
        this.filesToUpload.push(file);
        console.log('FIels ' , this.filesToUpload);
      }
    }

    uploadFiles(event){
      this.showFileUploadModal = false;
      this.showLoadingSpinner = true;
      console.log('FIels ' , this.filesToUpload);
      this.filesToUpload.forEach(file => {
        var  formData = new FormData();
        formData.append('file', file);
        var url = this.graphUrl + this.driveId + '/items/' + this.currentFolderId + ':/' + file.name + ':/content';
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
          
          this.getSpecificFolderData(this.currentFolderId);
        })
      })
      this.filesToUpload = [];
    }
}
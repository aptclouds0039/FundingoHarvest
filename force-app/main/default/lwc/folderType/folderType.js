import { LightningElement, api } from 'lwc';

export default class FolderType extends LightningElement {
    
    @api folderType;


    get getFolder(){
        return this.folderType;
    }
    connectedCallback(){
        console.log('Foldet Type' + this.folderType);
    }



}
import { LightningElement, api } from 'lwc';


export default class CustomName extends LightningElement {

    @api folderType;
    @api folderName;
    @api fileId;
    @api eTag;

    get isFolder(){
        return this.folderType;
    }

    handleNameLinkClick(){
        const event = new CustomEvent('viewfile', {
            composed: true,
            bubbles: true,
            cancelable: true,
            detail: {
                fileFolderObj : {
                    folderName: this.folderName,
                    fileId: this.fileId,
                    eTag: this.eTag,
                    folderType: this.folderType
                }
            },
        });
        console.log('Name Click event firing : ', event);
        this.dispatchEvent(event);
    }
}
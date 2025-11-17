class AgGrid {
  staticId;
  container;
  ajaxId;
  itemsToSubmit;

  _utils;

  _agHeader;
  _agBody;

  _data;

  constructor(staticId, ajaxId, itemsToSubmit) {
    this.staticId      = staticId;
    this._ajaxId       = ajaxId;
    this.itemsToSubmit = itemsToSubmit.split(',').map((itemToSubmit) => `#${itemToSubmit}`).join(',');
    this._utils        = new Utils();

    this._initialize();
  }

  async _initialize() {
    this._gridUtils.bindDynamicActions.beforeRefresh();

    this.container = this._createContainer();

    this.container.style.width =  '100%';

    this.container.className = 'ag-container';

    const data = await this._makeJSONRequest();

    try {
      this.buildAG(data);
    } catch (e) {
      this._utils.message.clearMessages();
      this._utils.message.showErrorMessage(`Falha ao construir AG: \n${e.message}`);

      console.error(e);
    }

    this._gridUtils.bindDynamicActions.afterRefresh();
    this._gridUtils.bindActions.refresh();
  }

  _createContainer() {
    // let agContainer = $(`<div id="ag-${apex.util.escapeHTMLAttr(this.staticId)}"></div>`);
    let agContainer = document.createElement('div');

    agContainer.id = `ag-${apex.util.escapeHTMLAttr(this.staticId)}`;

    // $(`.t-Region-body > #${this.staticId}`).append(agContainer);

    document.querySelector(`.t-Region-body > #${this.staticId}`).appendChild(agContainer);

    return agContainer;
  }

    async _makeJSONRequest() {
      let responseData;

      console.log('calling request');

      await apex.server.plugin(
        this._ajaxId,
        {
          pageItems: this.itemsToSubmit
        },
        {
          success: (res) => {
            console.log(JSON.parse(res.data));

            responseData = res.data;
          },
          error: (err) => {
            console.error(err);
            
            this._utils.message.clearMessages();

            if (err.responseText) this._utils.message.showErrorMessage(`Erro ao consultar JSON: \n ${err.responseText}`);
          }
        }
      );

      console.log('request called');

      return responseData;
  }

  buildAG(pData) {
    console.time('buildAG');

    let data = this._utils.json.parseSafe(pData);

    if (data) {
      this._data = data;

      this._data.pagination = {
        columns: {
          offset: 0,
          paginate: 50,
        },
        rows: {
          offset: 0,
          paginate: 50,
        }
      }

      this.buildAGToolbar(this.container);

      this._agHeader = this.buildAGHeaderContainer();

      this.container.appendChild(this._agHeader);

      this.buildAGColumnHeader(this._agHeader, data);

      $('.ag-col-resizable').each(function() {
        const $header  = $(this);
        const columnId = $header.attr('id');

        $header.resizable({
          handles: 'e',
          minWidth: 50,
          start: function() {
            $(this).css('flex', '0 0 auto');
          },
          alsoResize: $(`.ag-cell-container[data-column-header-id="${columnId}"]`),
          stop: function(event, ui) {
            const newWidth = ui.size.width;

            $(`.ag-cell-container[data-column-header-id="${columnId}"]`).css({'width': `${newWidth}px`, flex: '0 0 auto'});
          }
        });
      });

      this._agBody = this.buildAGBody();

      this.container.appendChild(this._agBody.bodyContainer);

      this.buildAGBodyRow(this._agBody.rowsContainer, data);

      this._gridUtils.addScrollGrid(this.staticId);

      this._gridUtils.setAutoResize(this.staticId);

      this._gridUtils.columnUtils.headerUtils.setStickyHeader(this.staticId);
      
    }

    console.timeEnd('buildAG');
  }

  buildAGToolbar(pContainer) {
    let toolbarContainer = $('<div></div>');

    toolbarContainer.addClass('ag-toolbar-container');

    let toolbarSearchFieldContainer = $('<div></div>');

    toolbarSearchFieldContainer.addClass('ag-toolbar-search-field-container');

    toolbarSearchFieldContainer.append('<div class="ag-toolbar-search-field-input-container"></div>');

    toolbarSearchFieldContainer.find('.ag-toolbar-search-field-input-container').append(`<div></div>`);

    toolbarSearchFieldContainer.find('.ag-toolbar-search-field-input-container > div').first().addClass('ag-toolbar-search-input-icon-container');

    toolbarSearchFieldContainer.find('.ag-toolbar-search-input-icon-container').append('<span class="fa fa-search"></span>');

    toolbarSearchFieldContainer.find('.ag-toolbar-search-field-input-container').append('<div></div>');

    toolbarSearchFieldContainer.find('.ag-toolbar-search-field-input-container > div').last().addClass('ag-toolbar-search-input-container');

    toolbarSearchFieldContainer.find('.ag-toolbar-search-input-container').append(`<input id="ag-toolbar-input-${this.staticId}" type="text" placeholder="Pesquisar ...">`);

    toolbarContainer.append(toolbarSearchFieldContainer);

    pContainer.appendChild(toolbarContainer[0]);

    // $(`ag-toolbar-input-${this.staticId}`).on('keyup', () => {

    // });
  }

  buildAGHeaderContainer() {
    let headerContainer = document.createElement('div');

    headerContainer.className = 'ag-col-header-container u-flex';

    return headerContainer;
  }

  buildAGColumnHeader(pHeaderContainer, pData) {
    let columsOption = Object.values(pData.options?.columns);
    let columnsKeys  = Object.keys(pData.options?.columns);

    let fragment = document.createDocumentFragment();

    columsOption.forEach((columnOption, i) => {
      if (!columnOption.staticId) columnOption.staticId = this._utils.random.getRandomId();

       let columnHeader = document.createElement('div');

      columnHeader.className = 'ag-col-header ag-col-resizable ag-u-flex';

      columnHeader.id = `${columnOption.staticId}`;

      columnHeader.setAttribute('data-column', `${this._utils.escapeHtml(columnsKeys[i])}`);

      if (columnOption.width) columnHeader.style.width = `${columnOption.width}px`;

      let tradeColumnSequence = document.createElement('div');

      let columnHeaderValue = document.createElement('div');

      columnHeaderValue.className = 'ag-col-header-content';

      columnHeaderValue.style.textAlign = columnOption.alignment.toLowerCase() || 'start';

      columnHeaderValue.innerText = this._utils.escapeHtml(columnOption.header);

      columnHeader.appendChild(tradeColumnSequence);

      columnHeader.appendChild(columnHeaderValue);

      columnHeader.appendChild(this._gridUtils.columnUtils.headerUtils.buildColumnOrderBy());

      fragment.appendChild(columnHeader);
    });

    pHeaderContainer.appendChild(fragment);
  }

  buildAGBody() {
    let bodyContainer = document.createElement('div');

    bodyContainer.className = 'ag-body-container';
    
    let rowsContainer = document.createElement('div');

    rowsContainer.className = 'ag-rows-container';

    let bodyFooterContainer = document.createElement('div');

    bodyFooterContainer.className = 'ag-body-footer-container';

    bodyContainer.appendChild(rowsContainer);
    bodyContainer.appendChild(bodyFooterContainer);

    return {
      "bodyContainer": bodyContainer,
      "rowsContainer": rowsContainer,
      "bodyFooterContainer": bodyFooterContainer
    }
  }

  buildAGBodyRow(pContainer, pData) {
    let rowContainer
    let pkRowData;
    let rowColumnContainer;
    let columnsOptions = pData.options?.columns || {};
    let columnOption;
    let errorMessage;
    let columnDOMConfig = {};
    let customColumnData;
    let badgeColor = "#FFFFFF";
    let fontColor  = "#FFFFFF";
    let columns;

    let fragment = document.createDocumentFragment();

    pData.model?.data.forEach((rowData, i) => {
      rowContainer = document.createElement('div');
      rowContainer.className = 'ag-row-container ag-u-flex';
      
      pkRowData    = [];

      if (!columns) {
         columns = Object.keys(rowData);
      }

      columns.forEach((columnName) => {
        let rowColumnData = rowData[columnName];

        columnOption = columnsOptions[columnName] 
                    || columnsOptions[columnName.toUpperCase()] 
                    || columnsOptions[columnName.toLowerCase()] 
                    || null;      

        if (!columnOption) {
          errorMessage = `Opções para a coluna "${columnName.toUpperCase()}" não encontrada.`;

          this._utils.message.showErrorMessage(errorMessage);

          throw new Error(errorMessage);
        }

        if (!columnDOMConfig[columnName]) {
          columnDOMConfig[columnName] = {
            "width": $(`#${columnOption.staticId}`).css('width'),
            "height": $(`#${columnOption.staticId}`).css('height'),
          }
        } 

        // if (columnOption.primaryKey) pkRowData.push(rowColumnData.value);

        rowColumnContainer = document.createElement('div');
        
        rowColumnContainer.className    = 'ag-cell-container';

        rowColumnContainer.style.textAlign = columnOption.alignment.toLowerCase() || 'start';
        rowColumnContainer.style.width     = columnDOMConfig[columnName].width;
        // rowColumnContainer.style.width     = document.getElementById(columnOption.staticId).getBoundingClientRect().width;
        rowColumnContainer.style.height    = columnDOMConfig[columnName].height;

        console.log(rowColumnContainer.style.width);

        rowColumnContainer.setAttribute('data-column-header-id', columnOption.staticId);
        rowColumnContainer.setAttribute('data-column', this._utils.escapeHtml(columnName));
        
        if (rowColumnData.custom) {
          customColumnData = rowColumnData.custom;

          if (customColumnData.displayType == "BADGE") {
            if (rowColumnData.value) {
              if (["DANGER", "WARNING", "SUCCESS", "INFO"].includes(customColumnData.badgeColor.toUpperCase())) {
                badgeColor = this._utils.color.getTemplateColor(customColumnData.badgeColor)?.color;
                fontColor  = this._utils.color.getTemplateColor(customColumnData.badgeColor)?.fontColor;
              } else {
                badgeColor = customColumnData.badgeColor;
                fontColor  = (customColumnData.fontColor) ? customColumnData.fontColor : this._utils.color.getContrastYIQ(customColumnData.fontColor);
              }

              rowColumnContainer.appendChild(
                this._gridUtils.columnUtils.cellUtils.buildBadgeCell(
                  this._utils.escapeHtml(rowColumnData.value),
                  badgeColor,
                  fontColor,
                  (customColumnData.badgeType || 1)
                )
              );

              rowColumnContainer.style.minWidth = '120px';
              document.getElementById(columnOption.staticId).style.minWidth = '120px';             
            }
          }
        }
        else {
          rowColumnContainer.innerText = this._utils.escapeHtml(rowColumnData.value);
        }

        rowContainer.appendChild(rowColumnContainer);
      });

      fragment.appendChild(rowContainer);
    });

    pContainer.appendChild(fragment);
  }

  _badgeColumnContainer;
  _badgeColumnColor = '#FFFFFF';
  _badgeColumn = $('<div class="ag-badge-column"></div>');

  _columnHeaderOrderBy;
  _columnHeaderOrderByContainer;
  
  _orderByAscButton;
  _orderByDescButton;

  _autoResizeTimer;


  _gridUtils = {
    setAutoResize: (pStaticId) => {
      const autoResize = () => {
        clearTimeout(this._autoResizeTimer);

        this._autoResizeTimer = setTimeout(() => {
          console.log('efetuando resize');

          let columnHeaders = document.querySelectorAll(`#ag-${pStaticId} .ag-col-header`);
          
          for(const columnHeader of columnHeaders) {
            document.querySelectorAll(`#ag-${pStaticId} .ag-cell-container[data-column="${columnHeader.getAttribute('data-column')}"]`).forEach((rowColumn) => {
              rowColumn.style.width = `${columnHeader.getBoundingClientRect().width}px`;
            });
          }
        }, 1200);       
      };

      // window.removeEventListener('resize', autoResize);
      window.addEventListener('resize', autoResize);
    },
    bindDynamicActions: {
      beforeRefresh: () => {
        apex.jQuery(`#${this.staticId}`).trigger('apexbeforerefresh');
      },
      afterRefresh: () => {
        apex.jQuery(`#${this.staticId}`).trigger('apexafterrefresh');
      },
    },
    bindActions: {
      refresh: async () => {
        let data;
        
        const requestJSONData = async () => {
          this._gridUtils.bindDynamicActions.beforeRefresh();

          data = await this._makeJSONRequest();

          try {
            this.container.innerHTML = '';

            this.buildAG(data);
          } catch (e) {
            this._utils.message.clearMessages();
            this._utils.message.showErrorMessage(`Falha ao construir AG: \n${e.message}`);

            console.error(e);
          }

          this._gridUtils.bindDynamicActions.afterRefresh();
        }

        $(`#${this.staticId}`).off('apexrefresh', requestJSONData);

        $(`#${this.staticId}`).on('apexrefresh', requestJSONData);

      }
    },
    addScrollGrid: (pStaticId) => {
      const scroller        = document.querySelector(`#${pStaticId} .ag-rows-container`);
      const columnContainer = document.querySelector(`#${pStaticId} .ag-col-header-container`);

      function setScrollerScrollPositionToColumnContainer() {
        columnContainer.style.transform = `translateX(-${scroller.scrollLeft}px)`;
      }

      scroller.removeEventListener('scroll', setScrollerScrollPositionToColumnContainer);

      scroller.addEventListener('scroll', setScrollerScrollPositionToColumnContainer);
    },
    columnUtils: {
      headerUtils: {
        setStickyHeader: (pStaticId) => {
          this._gridUtils.columnUtils.headerUtils.createPlaceHolderHeader(pStaticId);

          $(`#${pStaticId} .ag-col-header-container`).stickyWidget();
        },
        createPlaceHolderHeader: (pStaticId) => {
          const colHeaderContainer = document.querySelector(`#${pStaticId} .ag-col-header-container`);

          $(colHeaderContainer).after(`<div class="ag-u-flex" style="width: ${colHeaderContainer.getBoundingClientRect().width}px;"></div>`);
        },
        buildColumnOrderBy: () => {
          this._columnHeaderOrderBy = document.createElement('div');

          this._columnHeaderOrderBy.className = 'ag-header-order-by';
          
          this._columnHeaderOrderByContainer = document.createElement('div');

          this._columnHeaderOrderByContainer.className = 'ag-header-order-by-container';

          this._orderByAscButton  = document.createElement('div');
          this._orderByDescButton = document.createElement('div');

          this._orderByAscButton.className  = 'ag-header-order-by-button';
          this._orderByDescButton.className = 'ag-header-order-by-button';

          this._orderByAscButton.setAttribute('orderby-type', 'ASC');
          this._orderByDescButton.setAttribute('orderby-type', 'DESC');

          this._orderByAscButton.setAttribute('title', 'Classificar por ordem crescente');
          this._orderByDescButton.setAttribute('title', 'Classificar por ordem decrescente');

          this._orderByAscButton.innerHTML  = '<span class="fa fa-chevron-up" style="font-size: inherit;"></span>';
          this._orderByDescButton.innerHTML = '<span class="fa fa-chevron-down" style="font-size: inherit;"></span>';

          this._columnHeaderOrderByContainer.appendChild(this._orderByAscButton);
          this._columnHeaderOrderByContainer.appendChild(this._orderByDescButton);

          return this._columnHeaderOrderBy;
        }
      },
      cellUtils: {
        buildBadgeCell: (pValue, pBadgeColor = '#9500BA', pFontColor = "#FFFFFF", pType = 1) => {
          this._badgeColumnContainer = document.createElement('div');
          
          this._badgeColumnContainer.className = 'ag-badge-column-container';

          this._badgeColumn = document.createElement('div');

          this._badgeColumn.className = 'ag-badge-column';

          if (pType == 2) {
            this._badgeColumnColor  = this._utils.color.reduceHexOpacity(pBadgeColor, '0.3');

            this._badgeColumn.style.border = `solid 2px ${pBadgeColor}`;
          } else {
            this._badgeColumnColor      = pBadgeColor;
          }

          this._badgeColumn.style.backgroundColor = this._badgeColumnColor;
          this._badgeColumn.style.color           = (pType != 2) ? pFontColor : pBadgeColor;

          this._badgeColumn.innerText = pValue;

          this._badgeColumnContainer.appendChild(this._badgeColumn);

          return this._badgeColumnContainer;
        }
      }
    }
  }
}

class Utils {
  constructor() {}

  _templateColorType = {
    "DANGER": {
      "color": "#CB1100",
      "fontColor:": "#FFFFFF",
    },
    "WARNING": {
      "color": "#FFC628",
      "fontColor": "#2B2B2B",
    },
    "SUCCESS": {
      "color": "#278701",
      "fontColor": "#FFFFFF"
    },
    "INFO": {
      "color": "#056AC8",
      "fontColor": "#FFFFFF"
    },
  };

  escapeHtml = (pValue) => {
      // (typeof rowColumnData.value == 'string') ? apex.util.escapeHTML(pValue) : pValue

    return (pValue) ? apex.util.escapeHTML(String(pValue)) : '';
  }

  message = 
  {
    clearMessages: () => {
      apex.message.clearErrors();
    },
    showErrorMessage: (pMessage) => {
      apex.message.showErrors(
        {
          "type": apex.message.TYPE.ERROR,
          "location": ["page"],
          "message": pMessage,
          "unsafe": true,
        }
      );
    }
  };

  json = 
  {
    parseSafe: (pJSON) => {
      try {
        return JSON.parse(pJSON);
      } catch (err) {
        this.message.clearMessages();

        this.message.showErrorMessage(`Erro ao validar JSON: \n ${err.message || err}`);

        return null;
      }
    }
  };

  random = {
    getRandomInt: (min, max) => {
      min = Math.ceil(min);
      max = Math.floor(max);

      return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    getRandomId: () => {
      return crypto.randomUUID().split('-')[this.random.getRandomInt(0, 4)];
    }
  };

  color = {
    getContrastYIQ: (hexColor) => {
      let r, g, b, yiq;
      
      r = parseInt(hexColor.substr(2, 2), 16);
      r = parseInt(hexColor.substr(4, 2), 16);
      r = parseInt(hexColor.substr(6, 2), 16);

      yiq = (r * 299 + g * 587 * + b * 114) / 1000;

      return (yiq >= 120) ? '#2B2B2B' : '#FFFFFF';
    },
    reduceHexOpacity: (hexColor, opacity = '5%') => {
      return `rgba(${parseInt(hexColor.substr(1, 2), 16)}, ${parseInt(hexColor.substr(3, 2), 16)}, ${parseInt(hexColor.substr(5, 2), 16)}, ${opacity})`;
    },
    getTemplateColor: (pTemplateType) => {
      return this._templateColorType[String(pTemplateType).toUpperCase()];
    }
  }
}